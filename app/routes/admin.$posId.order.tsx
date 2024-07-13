import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHandle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wrapActionError } from "@/lib/action-error";
import { calculateTax } from "@/lib/calculate-tax";
import { formatPrice } from "@/lib/format-price";
import { padNumber } from "@/lib/pad-number";
import { useRevalidation } from "@/lib/use-revalidation";

import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { FileInput } from "@/components/ui/file-input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  unstable_parseMultipartFormData
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useOutletContext
} from "@remix-run/react";
import { verifySessionPOSAccess } from "app/service/auth";
import {
  adminAcceptOrder,
  adminCancelOrder,
  adminCompleteOrder,
  adminGetAcceptedOrders,
  adminGetHistoryOrders,
  adminGetPendingOrders,
  adminUpdatePaymentProof,
  generateOrderQrCode,
  ORDER_ERROR_CODE,
  ORDER_STATUS_ENUM,
  ORDER_STATUS_LABEL_ID
} from "app/service/order";
import { s3UploadHandler } from "app/service/s3";
import { capitalize } from "lodash-es";
import { CircleCheck, CircleX, QrCode, Trash, Upload } from "lucide-react";
import { DateTime } from "luxon";
import qrcode from "qrcode";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from "react";

const TEXT_TEMPLATE = `
Halo {name}, antrian {pos} sudah siap untuk {pax}.

Terima kasih.
`.trim();

const QUEUE_ENUM_LABEL: any = {
  PENDING: "Menunggu",
  ACKNOWLEDGED: "Diterima",
  CANCELLED: "Ditolak",
  USER_CANCELLED: "Dibatalkan pelanggan"
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const [orders, accepted, history] = await Promise.all([
    adminGetPendingOrders?.(params.posId!),
    adminGetAcceptedOrders?.(params.posId!),
    adminGetHistoryOrders?.(params.posId!)
  ]);

  return {
    orders,
    accepted,
    history
  };
}

export const action = wrapActionError(async function ({
  request,
  params
}: ActionFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const formData = await unstable_parseMultipartFormData(
    request,
    s3UploadHandler
  );
  const payload = Object.fromEntries(formData) as any;

  if (payload._action === "accept") {
    const order = await adminAcceptOrder?.(payload.order_id!);
    return { order };
  } else if (payload._action === "cancel") {
    const order = await adminCancelOrder?.(payload.order_id!, payload.notes);
    return { order };
  } else if (payload._action === "complete") {
    const order = await adminCompleteOrder?.(payload);
    return { order };
  } else if (payload._action === "generate_payment_qr") {
    const qrcode = await generateOrderQrCode?.(payload.order_id!);
    return { qrcode, order_id: payload.order_id! };
  } else if (payload._action === "upload_payment_proof") {
    const order = await adminUpdatePaymentProof?.(payload);
    return { order };
  }

  return {};
});

export default function OrderAdmin() {
  const { pos } = useOutletContext<any>();
  const { orders, accepted, history } = useLoaderData<typeof loader>();
  const action = useActionData<any>();
  const [selectedOrderId, setSelectedOrderId] = useState<any>(null);
  const [query, setQuery] = useState<string>("");
  const [qrPayment, setQrPayment] = useState<string>("");
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  const [completeOrder, setCompleteOrder] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [uploadProof, setUploadProof] = useState<any>(null);
  const { toast } = useToast();
  const navigation = useNavigation();

  useRevalidation();

  /** STATE STUFF */
  const isSubmitting = useMemo(
    () => navigation.state === "submitting",
    [navigation.state]
  );
  const orderMap = useMemo(() => {
    const map = {} as any;
    orders?.forEach((o) => {
      map[o.id] = o;
    });
    accepted?.forEach((o) => {
      map[o.id] = o;
    });
    history?.forEach((o) => {
      map[o.id] = o;
    });
    return map;
  }, [orders, accepted, history]);
  const deferredOrder = useDeferredValue(orderMap[selectedOrderId]);
  const deferredQuery = useDeferredValue(query);
  const [filteredOrders, filteredAccepted, filteredHistory] = useMemo(() => {
    if (!deferredQuery) {
      return [orders, accepted, history];
    }
    const regexp = new RegExp(deferredQuery.replace(/^0/i, ""), "i");
    const _filteredOrders = orders?.filter(
      (o) =>
        regexp.test(o.name) ||
        regexp.test(padNumber(o.temp_count)) ||
        regexp.test(o.phone)
    );
    const _filteredAccepted = accepted?.filter(
      (o) =>
        regexp.test(o.name) ||
        regexp.test(padNumber(o.temp_count)) ||
        regexp.test(o.phone)
    );
    const _filteredHistory = history?.filter(
      (o) =>
        regexp.test(o.name) ||
        regexp.test(padNumber(o.temp_count)) ||
        regexp.test(o.phone)
    );
    return [_filteredOrders, _filteredAccepted, _filteredHistory];
  }, [orders, accepted, history, deferredQuery]);
  const [addonGroupsMap, addonsMap, totalWTax] = useMemo(() => {
    if (!deferredOrder) return [];
    const { menu_snapshot, tax_snapshot } = deferredOrder || {};
    const addonGroups = Object.values(
      deferredOrder?.menu_snapshot || {}
    )?.flatMap((i) => i.addon_groups || []);
    const addons = addonGroups?.flatMap((i) => i.addons || []);
    const addonGroupsMap = Object.fromEntries(
      addonGroups?.map((i) => [i.id, i]) || []
    );
    const addonsMap = Object.fromEntries(addons?.map((i) => [i.id, i]) || []);
    const _currentTotal = Object.values(
      deferredOrder?.instance_record_json || {}
    ).reduce((t, instance: any) => {
      const basePrice = Number(menu_snapshot?.[instance.menu_id]?.price) || 0;
      const addonPrice =
        instance.addon_ids?.reduce((t2, addonId: any) => {
          const addon = addonsMap[addonId];
          if (addon) {
            return t2 + Number(addon.price);
          }
          return t2;
        }, 0) || 0;

      const instancePrice = (basePrice + addonPrice) * instance.qty;

      return t + instancePrice;
    }, 0) as number;

    const _totalWTax = tax_snapshot?.value
      ? _currentTotal + calculateTax(_currentTotal, tax_snapshot.value)
      : _currentTotal;

    return [addonGroupsMap, addonsMap, _totalWTax];
  }, [deferredOrder]);

  useEffect(() => {
    if (action?.error?.code === ORDER_ERROR_CODE.INVALID_ORDER_STATUS) {
      toast({
        title: (
          <div className="flex flex-row items-center">
            <CircleX className="mr-1.5 h-4 w-4 text-red-500" />
            Pesanan gagal diperbarui
          </div>
        ),
        description: (
          <span className="text-xs">{action?.error?.details?.status}</span>
        ),
        duration: 5000
      });
    }
    if (action?.qrcode) {
      qrcode
        .toDataURL(action.qrcode, {
          width: 500,
          errorCorrectionLevel: "medium",
          margin: 0,
          color: {
            dark: "#000000",
            light: "#ffffff"
          }
        })
        .then((url) => {
          if (action.order_id === deferredOrder?.id) {
            setQrPayment(url);
          } else {
            toast({
              title: (
                <div className="flex flex-row items-center">
                  <CircleX className="mr-1.5 h-4 w-4 text-red-500" />
                  QR Pembayaran gagal
                </div>
              ),
              description: <span className="text-xs">Coba lagi</span>,
              duration: 4000
            });
          }
        });
    }
  }, [action]);

  return (
    <>
      <div className={cn("flex w-screen justify-center")}>
        <Tabs
          defaultValue="list"
          className="mt-0 w-full overflow-x-hidden lg:w-[400px]"
        >
          <TabsList className="mx-3 mb-2 grid h-fit grid-cols-3">
            <TabsTrigger value="list">Pesanan ({orders?.length})</TabsTrigger>
            <TabsTrigger value="accepted">
              Diterima ({accepted?.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Riwayat ({history?.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="px-3">
            <div className="mt-2 flex w-full flex-row items-center">
              <Button
                variant={"outline"}
                className="rounded-r-none"
                disabled={!query?.trim()}
                onClick={() => setQuery("")}
              >
                <Trash className="w-4" />
              </Button>
              <Input
                type="text"
                inputMode="search"
                placeholder="Cari nomor, nama, handphone"
                className="rounded-l-none border-l-0"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Waktu pesanan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((o) => (
                  <Fragment key={o.id}>
                    <TableRow onClick={() => setSelectedOrderId(o.id)}>
                      <TableCell className="font-medium">
                        {padNumber(o.temp_count)}
                      </TableCell>
                      <TableCell>{o.name}</TableCell>
                      <TableCell className="text-right">
                        {DateTime.fromISO(o.created_at).toRelative()}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="accepted" className="px-3">
            <div className="mt-2 flex w-full flex-row items-center">
              <Button
                variant={"outline"}
                className="rounded-r-none"
                disabled={!query?.trim()}
                onClick={() => setQuery("")}
              >
                <Trash className="w-4" />
              </Button>
              <Input
                type="text"
                inputMode="search"
                placeholder="Cari nomor, nama, handphone"
                className="rounded-l-none border-l-0"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Waktu pesanan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccepted?.map((o) => (
                  <Fragment key={o.id}>
                    <TableRow onClick={() => setSelectedOrderId(o.id)}>
                      <TableCell className="font-medium">
                        {padNumber(o.temp_count)}
                      </TableCell>
                      <TableCell>{o.name}</TableCell>
                      <TableCell className="text-right">
                        {DateTime.fromISO(o.created_at).toRelative()}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="history" className="px-3">
            <div className="mt-2 flex w-full flex-row items-center">
              <Button
                variant={"outline"}
                className="rounded-r-none"
                disabled={!query?.trim()}
                onClick={() => setQuery("")}
              >
                <Trash className="w-4" />
              </Button>
              <Input
                type="text"
                inputMode="search"
                placeholder="Cari nomor, nama, handphone"
                className="rounded-l-none border-l-0"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory?.map((q) => (
                  <Fragment key={q.id}>
                    <TableRow onClick={() => setSelectedOrderId(q.id)}>
                      <TableCell className="font-medium">
                        {padNumber(q.temp_count)}
                      </TableCell>
                      <TableCell>{q.name}</TableCell>
                      <TableCell className="text-right">
                        {ORDER_STATUS_LABEL_ID[q.status]}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={!!qrPayment}
        onOpenChange={(e) => !e && setQrPayment("")}
      >
        <AlertDialogContent
          className="flex min-h-[50svh] flex-col gap-3 px-4 py-3 sm:rounded-sm"
          onClickOverlay={() => setQrPayment("")}
        >
          <div className="flex h-fit flex-row items-center justify-center overflow-hidden p-0">
            <span className="mb-0 block truncate whitespace-nowrap p-0 pr-4 font-mono text-xl font-semibold">
              Pesanan {padNumber(deferredOrder?.temp_count)},{" "}
              {deferredOrder?.name}
            </span>
          </div>
          <img
            src={qrPayment}
            className="pointer-events-none mt-0 max-h-[60svh] w-full object-contain"
          />
          <div className="flex flex-row justify-center font-mono">
            <span className="text-xl font-semibold">
              {formatPrice(totalWTax)}
            </span>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelOrder && deferredOrder?.id}
        onOpenChange={(e) => !e && setCancelOrder(null)}
      >
        <AlertDialogContent className="flex flex-col px-3 pb-5 pt-3 sm:rounded-sm">
          <div className="flex flex-col items-center">
            <span className="font-semibold">
              Tolak pesanan {padNumber(deferredOrder?.temp_count)}
            </span>
            <span className="text-sm text-muted-foreground">
              Apakah Anda yakin untuk menolak pesanan ini?
            </span>
          </div>
          <Form
            method="post"
            encType="multipart/form-data"
            className="flex w-full flex-col"
            onSubmit={() => {
              setSelectedOrderId(null);
              setCancelOrder(null);
            }}
          >
            <Textarea
              className="mb-3"
              placeholder="Catatan pesanan ditolak"
              name="notes"
              rows={2}
              maxLength={300}
            />
            <Input type="hidden" name="order_id" value={deferredOrder?.id} />
            <div className="flex flex-row gap-2">
              <Button
                variant={"outline"}
                type="submit"
                name="_action"
                value="cancel"
                className="w-1/2"
              >
                Ya
              </Button>
              <Button
                className="w-1/2"
                variant={"default"}
                type="button"
                onClick={() => setCancelOrder(null)}
              >
                Tidak
              </Button>
            </div>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!paymentProof && deferredOrder?.id}
        onOpenChange={(e) => !e && setPaymentProof(null)}
      >
        <AlertDialogContent
          className="flex h-fit w-fit flex-col items-center rounded-sm px-4 py-4"
          onClickOverlay={() => setPaymentProof(null)}
        >
          <img
            src={deferredOrder?.payment_proof}
            className="max-h-[80svh] max-w-[80svw] rounded-sm object-contain"
          />
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!completeOrder && deferredOrder?.id}
        onOpenChange={(e) => !e && setCompleteOrder(null)}
      >
        <AlertDialogContent className="flex flex-col px-3 pb-5 pt-3 sm:rounded-sm">
          <div className="flex flex-col items-center">
            <span className="font-semibold">
              Selesaikan pesanan {padNumber(deferredOrder?.temp_count)}
            </span>
            <span className="text-sm text-muted-foreground">
              Apakah Anda yakin untuk selesaikan pesanan ini?
            </span>
          </div>
          <Form
            method="post"
            encType="multipart/form-data"
            className="flex w-full flex-col"
            onSubmit={() => {
              setSelectedOrderId(null);
              setCompleteOrder(null);
            }}
          >
            <FileInput
              accept="image/jpeg,image/png,image/webp"
              name="payment_proof"
              className="mb-3"
            >
              Bukti pembayaran
            </FileInput>
            <Input type="hidden" name="order_id" value={deferredOrder?.id} />
            <div className="flex w-full flex-row gap-2">
              <Button
                variant={"outline"}
                type="submit"
                name="_action"
                value="complete"
                className="w-1/2"
              >
                Ya
              </Button>
              <Button
                className="w-1/2"
                variant={"default"}
                type="button"
                onClick={(e) => {
                  setCompleteOrder(null);
                }}
              >
                Tidak
              </Button>
            </div>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!uploadProof && deferredOrder?.id}
        onOpenChange={(e) => !e && setUploadProof(null)}
      >
        <AlertDialogContent
          className="flex flex-col px-3 pb-5 pt-3 sm:rounded-sm"
          onClickOverlay={() => setUploadProof(null)}
        >
          <div className="flex flex-col items-center">
            <span className="font-semibold">
              Upload {padNumber(deferredOrder?.temp_count)}
            </span>
            <span className="text-sm text-muted-foreground">
              Upload bukti pembayaran {padNumber(deferredOrder?.temp_count)}
            </span>
          </div>
          <Form
            method="post"
            encType="multipart/form-data"
            className="flex w-full flex-col"
            onSubmit={() => {
              setUploadProof(null);
            }}
          >
            <FileInput
              accept="image/jpeg,image/png,image/webp"
              name="payment_proof"
              className="mb-3"
              required
            >
              Bukti pembayaran
            </FileInput>
            <Input type="hidden" name="order_id" value={deferredOrder?.id} />
            <div className="flex w-full flex-row gap-2">
              <Button
                variant={"default"}
                type="submit"
                name="_action"
                value="upload_payment_proof"
                className="w-full"
              >
                Upload
              </Button>
            </div>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* ORDER DRAWER */}
      <Drawer
        open={
          deferredOrder?.id &&
          !qrPayment &&
          !cancelOrder &&
          !completeOrder &&
          !paymentProof &&
          !uploadProof &&
          !isSubmitting
        }
        onOpenChange={(e) =>
          !e &&
          !qrPayment &&
          !cancelOrder &&
          !completeOrder &&
          !paymentProof &&
          !uploadProof &&
          !isSubmitting &&
          setSelectedOrderId(null)
        }
        disablePreventScroll={true}
        handleOnly={true}
      >
        <DrawerContent className="max-h-[90svh]">
          <DrawerHandle />
          {(() => {
            if (!deferredOrder) return null;

            return (
              <div className="flex h-full flex-col overflow-y-scroll pb-7">
                <div className="mt-1 flex w-full flex-col px-3">
                  <div className="flex flex-row items-center text-xl">
                    <span className="block font-semibold">
                      Pesanan no {padNumber(deferredOrder?.temp_count)}
                    </span>
                  </div>
                  <div className="mb-1 text-sm text-muted-foreground">
                    Tinjau untuk menerima atau menolak pesanan
                  </div>
                </div>
                <Table className="mb-1 border-b border-muted">
                  <TableBody>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell className="text-right">
                        {padNumber(deferredOrder?.temp_count)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Nama</TableCell>
                      <TableCell className="text-right">
                        {deferredOrder?.name}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Handphone</TableCell>
                      <TableCell className="text-right">
                        {deferredOrder?.phone || "Tidak tersedia"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell className="text-right">
                        {ORDER_STATUS_LABEL_ID[deferredOrder?.status]}
                      </TableCell>
                    </TableRow>
                    {deferredOrder?.notes && (
                      <TableRow>
                        <TableCell className="whitespace-nowrap">
                          Catatan
                        </TableCell>
                        <TableCell className="text-right">
                          {deferredOrder?.notes}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell>Waktu pesanan</TableCell>
                      <TableCell className="text-right">
                        <span className="block">
                          {DateTime.fromISO(deferredOrder?.created_at).toFormat(
                            "dd MMM yyyy, HH:mm ZZZZ"
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {DateTime.fromISO(
                            deferredOrder?.created_at
                          ).toRelative()}
                        </span>
                      </TableCell>
                    </TableRow>
                    {deferredOrder?.payment_proof && (
                      <TableRow
                        onClick={() => setPaymentProof(deferredOrder?.id)}
                      >
                        <TableCell>Bukti pembayaran</TableCell>
                        <TableCell className="flex flex-row justify-end">
                          <img
                            src={deferredOrder?.payment_proof}
                            className="h-10 w-10 rounded-sm object-cover"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex-grow">
                  {Object.entries(
                    deferredOrder?.instance_record_json || {}
                  ).map(([key, value]) => {
                    const { menu_id, qty, addon_ids, notes } = value || {};
                    const menu = deferredOrder?.menu_snapshot?.[menu_id];

                    if (!menu) return null;

                    const currentPrice = (addon_ids || []).reduce(
                      (t, i) => {
                        const addon = addonsMap[i];
                        return t + (addon?.price || 0);
                      },
                      Number(menu?.price) || 0
                    );

                    return (
                      <div className="flex shrink-0 flex-row items-center overflow-hidden px-2 py-2 transition-colors hover:bg-zinc-50">
                        <img
                          src={menu?.imgs?.[0]}
                          className="h-12 w-12 rounded-sm object-cover"
                        />
                        <div className="ml-3 flex flex-grow flex-col overflow-hidden pr-5">
                          <div className="flex flex-col">
                            <span className="block truncate font-semibold">
                              {menu?.title}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {addon_ids
                                .map((i) => {
                                  const addon = addonsMap[i];
                                  const group =
                                    addonGroupsMap[addon?.addon_group_id];

                                  if (group) {
                                    return capitalize(
                                      [group.title, addon.title].join(" ")
                                    );
                                  }

                                  return capitalize(addon.title);
                                })
                                .join(", ")}
                            </span>
                          </div>
                          <div className="mt-1 block text-xs text-muted-foreground">
                            {formatPrice(currentPrice)}
                          </div>
                          {notes && (
                            <span className="mt-2 block text-sm text-muted-foreground">
                              Catatan: {notes}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <Button variant={"outline"} disabled>
                            {qty}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mx-2 mt-2 flex flex-row items-center justify-between rounded-sm bg-zinc-50 px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-zinc-100">
                  <span>Total</span>
                  <span>{formatPrice(totalWTax)}</span>
                </div>

                {deferredOrder?.status === "PENDING" ? (
                  <Form
                    method="post"
                    encType="multipart/form-data"
                    onSubmit={() => setSelectedOrderId(null)}
                    className="mt-3 flex w-full flex-row gap-2 px-2"
                  >
                    <Input
                      type="hidden"
                      name="order_id"
                      value={deferredOrder?.id}
                    />
                    <Button
                      type="button"
                      variant={"outline"}
                      className="w-1/2"
                      onClick={() => setCancelOrder(deferredOrder?.id)}
                    >
                      <CircleX className="mr-2 w-4" />
                      Tolak
                    </Button>
                    <Button
                      variant={"default"}
                      className="w-1/2"
                      type="submit"
                      name="_action"
                      value="accept"
                    >
                      <CircleCheck className="mr-2 w-4" />
                      Terima
                    </Button>
                  </Form>
                ) : deferredOrder?.status === "ACCEPTED" ? (
                  <Form
                    method="post"
                    encType="multipart/form-data"
                    className="mt-3 flex w-full flex-row gap-2 px-2"
                  >
                    <Input
                      type="hidden"
                      name="order_id"
                      value={deferredOrder?.id}
                    />
                    <Button
                      type="button"
                      variant={"outline"}
                      className="w-1/2"
                      onClick={() => setCompleteOrder(deferredOrder?.id)}
                    >
                      <CircleCheck className="mr-2 w-4" />
                      Selesai
                    </Button>
                    <Button
                      variant={"default"}
                      className="w-1/2 whitespace-nowrap"
                      value="generate_payment_qr"
                      name="_action"
                      type="submit"
                    >
                      <QrCode className="mr-2 w-4" />
                      QR Pembayaran
                    </Button>
                  </Form>
                ) : (
                  (!deferredOrder?.payment_proof ||
                    deferredOrder?.payment_proof === "{}") &&
                  deferredOrder?.status !== ORDER_STATUS_ENUM.CANCELLED &&
                  deferredOrder?.status !==
                    ORDER_STATUS_ENUM.CANCELLED_BY_USER && (
                    <Form
                      method="post"
                      encType="multipart/form-data"
                      className="mt-3 flex w-full flex-row gap-2 px-2"
                    >
                      <Input
                        type="hidden"
                        name="order_id"
                        value={deferredOrder?.id}
                      />

                      <div className="flex w-full flex-row gap-2">
                        <Button
                          variant={"default"}
                          className="w-1/2"
                          type="button"
                          onClick={() => setUploadProof(true)}
                        >
                          <Upload className="mr-2 w-4" />
                          Upload bukti
                        </Button>
                        <Button
                          variant={"secondary"}
                          className="w-1/2"
                          type="submit"
                          name="_action"
                          value="generate_payment_qr"
                        >
                          <QrCode className="mr-2 w-4" />
                          QR Pembayaran
                        </Button>
                      </div>
                    </Form>
                  )
                )}
              </div>
            );
          })()}
        </DrawerContent>
      </Drawer>
    </>
  );
}
