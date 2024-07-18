import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHandle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wrapActionError } from "@/lib/action-error";
import { calculateTax } from "@/lib/calculate-tax";
import { formatPrice } from "@/lib/format-price";
import { padNumber } from "@/lib/pad-number";

import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordItem } from "@/constants/element";
import { openPhoneLink } from "@/lib/open-phone-link";
import { parsePhone } from "@/lib/parse-phone";
import { useLocalStorageState } from "@/lib/use-localstorage-state";
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
import { getMenuByPOS } from "app/service/menu";
import {
  adminAcceptOrder,
  adminCancelOrder,
  adminCompleteOrder,
  adminGetAcceptedOrders,
  adminGetHistoryOrders,
  adminGetPendingOrders,
  adminUpdatePaymentProof,
  createOrder,
  generateOrderQrCode,
  ORDER_ERROR_CODE,
  ORDER_STATUS_ENUM,
  ORDER_STATUS_LABEL_ID
} from "app/service/order";
import { getPOSTax } from "app/service/pos";
import { s3UploadHandler } from "app/service/s3";
import { capitalize } from "lodash-es";
import {
  CircleCheck,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  History,
  Pencil,
  Phone,
  QrCode,
  Trash,
  Upload
} from "lucide-react";
import { DateTime } from "luxon";
import qrcode from "qrcode";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from "react";
import { toast } from "sonner";
import {
  orderDraftReducer,
  OrderDraftShape
} from "./menu.$posId/order-draft-reducer";
import { createInstanceId } from "./menu.$posId/order-helper";

const TEXT_TEMPLATE = `
Halo {name}, pesanan #{order_number} {pos} sudah siap.

Terima kasih.
`.trim();

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const [orders, accepted, history, menus, tax] = await Promise.all([
    adminGetPendingOrders?.(params.posId!),
    adminGetAcceptedOrders?.(params.posId!),
    adminGetHistoryOrders?.(params.posId!),
    getMenuByPOS?.(params.posId!),
    getPOSTax?.(params.posId!)
  ]);

  const menuMap = Object.fromEntries(menus?.map((i) => [i.id, i]) || []);
  const addonGroupMap = Object.fromEntries(
    menus?.flatMap((i) => i.addon_groups)?.map((i) => [i?.id, i]) || []
  );
  const addonMap = Object.fromEntries(
    menus
      ?.flatMap((i) => i.addon_groups?.flatMap((j) => j.addons))
      ?.map((i) => [i?.id, i]) || []
  );

  return {
    orders,
    accepted,
    history,
    menus,
    menuMap,
    addonGroupMap,
    addonMap,
    tax
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
  } else if (payload._action === "admin_create_order") {
    const admin_create_order = await createOrder?.({
      ...payload,
      instance_record_json: JSON.parse(payload.instance_record_json || "{}"),
      status: "ACCEPTED"
    });
    return { admin_create_order };
  }

  return {};
});

export default function OrderAdmin() {
  const { pos } = useOutletContext<any>();
  const {
    orders,
    accepted,
    history,
    menus,
    menuMap,
    addonGroupMap,
    addonMap,
    tax
  } = useLoaderData<typeof loader>();
  const action = useActionData<any>();
  const [selectedOrderId, setSelectedOrderId] = useState<any>(null);
  const [query, setQuery] = useState<string>("");
  const [qrPayment, setQrPayment] = useState<string>("");
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  const [completeOrder, setCompleteOrder] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [uploadProof, setUploadProof] = useState<any>(null);
  const navigation = useNavigation();
  const [addMenu, setAddMenu] = useState(false);
  const [addMenuQuery, setAddMenuQuery] = useState("");
  const addMenuQueryDef = useDeferredValue(addMenuQuery);

  /** STATE STUFF */
  const [filteredMenus] = useMemo(() => {
    if (!addMenuQueryDef) return [menus];
    const regexp = new RegExp(addMenuQueryDef, "i");
    const _filteredMenus = menus?.filter(
      (i) =>
        regexp.test(i.title) ||
        i.addon_groups?.some(
          (j) =>
            regexp.test(j.title) || j.addons?.some((k) => regexp.test(k.title))
        )
    );
    return [_filteredMenus];
  }, [menus, addMenuQueryDef]);
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
      toast.error("Pesanan gagal diperbarui", {
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
            toast.error("QR Pembayaran gagal", {
              description: "Coba lagi"
            });
          }
        });
    }
    if (action?.admin_create_order) {
      setDraftNamePhone(["", ""]);
      setDraftOrder({});
      toast.success("Pesanan berhasil dibuat", {
        description: `Pesanan #${padNumber(action.admin_create_order.temp_count)} berhasil dibuat`,
        action: {
          label: "Lihat",
          onClick: () => {
            setSelectedOrderId(action.admin_create_order.id);
          }
        }
      });
    }
  }, [action]);

  const [[draftName, draftPhone], setDraftNamePhone] = useLocalStorageState(
    "admin-draft-name-phone",
    ["", ""]
  );
  const [draftOrder, setDraftOrder] = useLocalStorageState<OrderDraftShape>(
    "admin-draft-order",
    {}
  );
  const draftOrderDef = useDeferredValue(draftOrder);
  const [instanceTemp, setInstanceTemp] =
    useState<RecordItem<OrderDraftShape> | null>(null);

  /** STATE UTIL OPTIMIZATION, DEBOUNCED */
  const draftTotal = useMemo(() => {
    return Object.values(draftOrder || {}).reduce((t, instance) => {
      const basePrice = Number(menuMap[instance.menu_id]?.price) || 0;
      const addonPrice =
        instance.addon_ids?.reduce((t2, addonId) => {
          const addon = addonMap[addonId];
          if (addon) {
            return t2 + Number(addon.price);
          }
          return t2;
        }, 0) || 0;

      const instancePrice = (basePrice + addonPrice) * instance.qty;

      return t + instancePrice;
    }, 0);
  }, [draftOrder, menuMap, addonMap]);

  /** MENU ADDON SELECTION, LOCAL TO STATE */
  function toggleSelection(addonId: string, selection: any) {
    const addon = addonMap[addonId];
    const addonGroup = addonGroupMap[addon?.addon_group_id];

    /** SET TOGGLE VALUE */
    const nextValue = (() => {
      const _nextValue = !selection[addonId];

      /** DISABLE TOGGLE IF IT'S REQUIRED */
      if (
        !_nextValue &&
        addonGroup?.required &&
        !addonGroup?.addons?.filter((i) => i.id !== addonId && selection[i.id])
          .length
      ) {
        return !_nextValue;
      }

      return _nextValue;
    })();
    selection[addonId] = nextValue;

    /** DESELECT OTHER PAIR IF ONE SELECTION */
    if (
      nextValue &&
      !addonGroup?.multiple_select &&
      addonGroup?.addons?.length
    ) {
      addonGroup.addons?.forEach((i) => {
        if (i.id !== addonId) {
          selection[i.id] = !nextValue;
        }
      });
    }

    return selection;
  }

  return (
    <>
      <div className={cn("flex w-screen justify-center")}>
        <Tabs defaultValue="list" className="mt-0 w-full overflow-x-hidden">
          <TabsList className="mx-3 mb-2 grid h-fit grid-cols-3 sm:flex sm:flex-row sm:gap-1">
            <TabsTrigger
              className="hidden sm:block sm:flex-grow"
              value="create"
            >
              <Pencil className="mr-2 inline w-4" />
              Pesanan baru
            </TabsTrigger>
            <TabsTrigger className="sm:flex-grow" value="list">
              <ClipboardList className="mr-1.5 hidden w-4 sm:block" />
              Pesanan ({orders?.length})
            </TabsTrigger>
            <TabsTrigger className="sm:flex-grow" value="accepted">
              <ClipboardCheck className="mr-1.5 hidden w-4 sm:block" />
              Diterima ({accepted?.length})
            </TabsTrigger>
            <TabsTrigger className="sm:flex-grow" value="history">
              <History className="mr-1.5 hidden w-4 sm:block" />
              Riwayat ({history?.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="hidden flex-col px-3 sm:flex">
            <div className="mb-4 mt-2 flex w-full flex-row items-center px-1">
              <div className="flex w-full flex-col">
                <span className="text-lg font-semibold">Buat pesanan baru</span>
                <span className="text-sm text-muted-foreground">
                  Buat pesanan baru untuk pelanggan
                </span>
              </div>
              <Button
                className=""
                variant={"secondary"}
                onClick={() => setAddMenu(true)}
              >
                Tambah menu
              </Button>
            </div>
            <div className="mt-3 flex w-full flex-row items-end gap-2 px-1">
              <div className="flex flex-grow flex-col gap-1">
                <Label
                  htmlFor="admin-draft-name-input"
                  className="font-normal text-muted-foreground"
                >
                  Atas nama
                </Label>
                <Input
                  id="admin-draft-name-input"
                  type="text"
                  placeholder="Nama pelanggan"
                  className="capitalize"
                  value={draftName}
                  onChange={(e) =>
                    setDraftNamePhone([e.target.value, draftPhone])
                  }
                />
              </div>
              <div className="flex flex-grow flex-col gap-1">
                <Label
                  htmlFor="admin-draft-phone-input"
                  className="font-normal text-muted-foreground"
                >
                  Handphone
                </Label>
                <Input
                  id="admin-draft-phone-input"
                  inputMode="numeric"
                  type="text"
                  placeholder="Nomor handphone"
                  value={draftPhone}
                  onChange={(e) =>
                    setDraftNamePhone([draftName, parsePhone(e.target.value)])
                  }
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right">Kuantitas</TableHead>
                </TableRow>
              </TableHeader>
            </Table>

            <div className="mb-1 mt-1 flex flex-col gap-2">
              {Object.entries(draftOrder || {}).map(([id, instance], i) => {
                const currentPrice = instance.addon_ids?.reduce(
                  (t, addonId) => {
                    const addon = addonMap[addonId];
                    if (addon) {
                      return t + (Number(addon.price) || 0);
                    }
                    return t;
                  },
                  Number(menuMap[instance.menu_id]?.price) || 0
                );

                return (
                  <div
                    key={id}
                    className="flex w-full flex-row items-center hover:bg-zinc-50"
                    onClick={() => setInstanceTemp(draftOrder[id])}
                  >
                    <div className="w-10 px-3 text-sm text-muted-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <img
                        src={menuMap[instance.menu_id]?.imgs?.[0]}
                        className="h-12 w-12 rounded-sm object-cover"
                      />
                    </div>
                    <div className="ml-2 flex flex-grow flex-col">
                      <div className="flex flex-col text-sm">
                        <span>{menuMap[instance.menu_id]?.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {instance.addon_ids
                            ?.map((addonId) => addonMap[addonId]?.title)
                            .join(", ")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(currentPrice)}
                      </span>
                    </div>
                    <div className="flex flex-row justify-end">
                      <Button
                        variant={"outline"}
                        className="rounded-r-none border-r-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftOrder(
                            orderDraftReducer(draftOrder, {
                              type: "SET_INTANCE_QTY",
                              data: {
                                instance_id: id,
                                qty: instance.qty - 1
                              }
                            })
                          );
                        }}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={instance.qty}
                        className="w-12 rounded-none text-center"
                        disabled
                      />
                      <Button
                        variant={"outline"}
                        className="rounded-l-none border-l-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftOrder(
                            orderDraftReducer(draftOrder, {
                              type: "SET_INTANCE_QTY",
                              data: {
                                instance_id: id,
                                qty: instance.qty + 1
                              }
                            })
                          );
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Table>
              <TableBody>
                <TableRow className="text-xs text-muted-foreground">
                  <TableCell>Pajak daerah ({tax.value}%)</TableCell>
                  <TableCell></TableCell>
                  <TableCell colSpan={2} className="text-right">
                    {formatPrice(calculateTax(draftTotal, tax.value))}
                  </TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell colSpan={2} className="text-right">
                    {formatPrice(
                      draftTotal + calculateTax(draftTotal, tax.value)
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <Form method="post" encType="multipart/form-data">
              <div className="mt-3 flex w-full flex-row gap-3">
                <Input
                  type="hidden"
                  name="_action"
                  value="admin_create_order"
                />
                <Input type="hidden" name="pos_id" value={pos.id} />
                <Input type="hidden" name="name" value={draftName} />
                <Input type="hidden" name="phone" value={draftPhone} />
                <Input
                  type="hidden"
                  name="instance_record_json"
                  value={JSON.stringify(draftOrderDef)}
                />
                <Button
                  type="button"
                  className="w-2/5"
                  variant={"secondary"}
                  onClick={() => {
                    setDraftNamePhone(["", ""]);
                    setDraftOrder({});
                  }}
                  disabled={!Object.keys(draftOrder).length}
                >
                  Hapus pesanan
                </Button>
                <Button
                  className="w-3/5"
                  variant={"default"}
                  disabled={!Object.keys(draftOrder).length || !draftName}
                  type="submit"
                >
                  Buat pesanan
                </Button>
              </div>
            </Form>
          </TabsContent>
          <TabsContent value="list" className="px-3">
            <div
              className={cn(
                "mt-2 flex w-full flex-row items-center rounded-md",
                query && "border border-blue-200"
              )}
            >
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
                    <TableRow
                      onClick={() => {
                        setSelectedOrderId(o.id);
                      }}
                    >
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
            <div
              className={cn(
                "mt-2 flex w-full flex-row items-center rounded-md",
                query && "border border-blue-200"
              )}
            >
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
                  <TableHead className="text-right">Waktu diterima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccepted?.map((o) => (
                  <Fragment key={o.id}>
                    <TableRow
                      onClick={() => {
                        setSelectedOrderId(o.id);
                      }}
                    >
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
            <div
              className={cn(
                "mt-2 flex w-full flex-row items-center rounded-md",
                query && "border border-blue-200"
              )}
            >
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
                    <TableRow
                      onClick={() => {
                        setSelectedOrderId(q.id);
                      }}
                    >
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
                variant={"secondary"}
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
                variant={"default"}
                type="submit"
                name="_action"
                value="complete"
                className="w-1/2"
              >
                Ya
              </Button>
              <Button
                className="w-1/2"
                variant={"secondary"}
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

      <Drawer
        open={!!instanceTemp}
        onOpenChange={(e) => {
          if (!e) {
            setInstanceTemp(null);
            setDraftOrder(
              orderDraftReducer(draftOrder, {
                type: "CLEAR_EMPTY",
                data: { menuMap }
              })
            );
          }
        }}
        disablePreventScroll={true}
        handleOnly={true}
      >
        {(() => {
          const instance = instanceTemp;
          const addons =
            instance?.addon_ids?.map((i) => addonMap[i]).filter(Boolean) || [];
          const addonSelection = Object.fromEntries(
            instanceTemp?.addon_ids?.map((i) => [i, true]) || []
          );
          const menuDebounced = menuMap[instance?.menu_id || ""];

          return (
            <DrawerContent>
              <DrawerHandle />
              <div className="flex select-none flex-col overflow-y-scroll sm:pb-12">
                <div className="flex flex-col">
                  <div className="mb-2 mt-2 flex w-full flex-row px-4">
                    <img
                      src={menuDebounced?.imgs?.find(Boolean)}
                      className="aspect-[1] h-12 w-12 rounded-sm object-cover"
                    />
                    <div className="ml-3 flex w-full flex-col overflow-hidden">
                      <span className="block truncate font-semibold">
                        {menuDebounced?.title}
                      </span>
                      {addons?.length ? (
                        <span className="mb-2 block w-fit whitespace-nowrap text-xs text-muted-foreground">
                          {addons.map((i) => i.title).join(", ")}
                        </span>
                      ) : (
                        <span className="mb-2 block w-fit truncate whitespace-nowrap text-xs text-muted-foreground">
                          {menuDebounced?.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {menuDebounced?.addon_groups?.map((i) => (
                    <Fragment key={i.id}>
                      <div className="flex w-full flex-col px-4">
                        <span className="mt-1 text-sm font-semibold">
                          {i.title}
                        </span>
                        <div className="w-full">
                          <div className="mb-1 w-full border-t border-zinc-100"></div>
                        </div>
                      </div>
                      {i.addons?.map((j) => (
                        <div
                          key={j.id}
                          className="flex shrink-0 flex-row items-center justify-between rounded-sm px-4 py-2 transition-colors hover:bg-zinc-50"
                          onClick={() => {
                            if (instanceTemp) {
                              const newSelection = toggleSelection(
                                j.id,
                                addonSelection
                              );
                              const selectedAddonIds = Object.keys(
                                newSelection
                              ).filter((key) => !!newSelection[key]);
                              setInstanceTemp({
                                ...instanceTemp,
                                addon_ids: selectedAddonIds
                              });
                            }
                          }}
                        >
                          <div className="flex w-full flex-col justify-start overflow-hidden">
                            <span className="block truncate whitespace-nowrap text-sm font-semibold">
                              {j.title}
                            </span>
                            <span className="block truncate whitespace-nowrap text-xs text-muted-foreground">
                              {j.description}
                            </span>
                            <span className="block whitespace-nowrap text-xs text-muted-foreground">
                              {formatPrice(j.price)}
                            </span>
                          </div>
                          <div className="flex w-10 flex-row justify-center">
                            {i.multiple_select ? (
                              <Checkbox
                                className="h-5 w-5 p-0"
                                checked={
                                  instanceTemp?.addon_ids?.includes(j.id) ||
                                  false
                                }
                              />
                            ) : (
                              <Input
                                type="radio"
                                className="h-5 w-5 p-0 accent-primary"
                                checked={
                                  instanceTemp?.addon_ids?.includes(j.id) ||
                                  false
                                }
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </Fragment>
                  ))}
                  <div className="mb-2 flex flex-col px-4">
                    <Textarea
                      placeholder="Catatan"
                      className="mt-3 normal-case"
                      maxLength={500}
                      value={instanceTemp?.notes}
                      onChange={(e) => {
                        if (instanceTemp) {
                          setInstanceTemp({
                            ...instanceTemp,
                            notes: e.target.value
                          });
                        }
                      }}
                    />
                    <div className="mt-3 flex flex-row">
                      <Button
                        className="mr-0 w-fit rounded-r-none border-r-0"
                        variant="outline"
                        onClick={() => {
                          if (instanceTemp && instanceTemp.qty > 0) {
                            setInstanceTemp({
                              ...instanceTemp,
                              qty: instanceTemp.qty - 1
                            });
                          }
                        }}
                        disabled={!instanceTemp?.qty}
                      >
                        -
                      </Button>
                      <Input
                        disabled
                        type={"number"}
                        className="mr-0 w-1/6 rounded-none text-center"
                        value={instanceTemp?.qty || 0}
                      />
                      <Button
                        className="mr-3 w-fit rounded-l-none border-l-0"
                        variant="outline"
                        onClick={() => {
                          if (instanceTemp) {
                            setInstanceTemp({
                              ...instanceTemp,
                              qty: (instanceTemp?.qty || 0) + 1
                            });
                          }
                        }}
                      >
                        +
                      </Button>
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => {
                          setDraftOrder(
                            orderDraftReducer(draftOrder, {
                              type: "FLUSH_INSTANCE_TEMP",
                              data: {
                                instance_id: createInstanceId(
                                  instanceTemp?.menu_id || "",
                                  instanceTemp?.addon_ids || []
                                ),
                                instance: instanceTemp
                              }
                            })
                          );
                          setInstanceTemp(null);
                          setAddMenu(false);
                        }}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DrawerContent>
          );
        })()}
      </Drawer>

      <Drawer
        open={!instanceTemp && addMenu}
        onOpenChange={(e) => !e && !instanceTemp && setAddMenu(false)}
        disablePreventScroll={true}
        handleOnly={true}
      >
        <DrawerContent className="max-h-[90svh] sm:pb-14">
          <DrawerHandle />
          <div className="mt-2 flex w-full flex-col px-3">
            <div
              className={cn(
                "mt-2 flex w-full flex-row items-center rounded-md",
                addMenuQuery && "border border-blue-200"
              )}
            >
              <Button
                variant={"outline"}
                className="rounded-r-none"
                disabled={!addMenuQuery?.trim()}
                onClick={() => setAddMenuQuery("")}
              >
                <Trash className="w-4" />
              </Button>

              <Input
                type="text"
                inputmode="search"
                placeholder="Cari menu, addon"
                className="rounded-l-none border-l-0"
                value={addMenuQuery}
                onChange={(e) => setAddMenuQuery(e.target.value)}
              />
            </div>

            <div className="mt-3 flex w-full flex-col gap-2">
              {filteredMenus?.map((i) => {
                return (
                  <div
                    key={i.id}
                    className="flex flex-row transition-colors hover:bg-zinc-50"
                    onClick={() => {
                      if (i.addon_groups?.length) {
                        setInstanceTemp({
                          menu_id: i.id,
                          qty: 1,
                          addon_ids: [],
                          notes: ""
                        });
                      } else {
                        setDraftOrder(
                          orderDraftReducer(draftOrder, {
                            type: "FLUSH_INSTANCE_TEMP",
                            data: {
                              instance_id: createInstanceId(i.id, []),
                              instance: {
                                menu_id: i.id,
                                qty: 1,
                                addon_ids: [],
                                notes: ""
                              }
                            }
                          })
                        );
                        setAddMenu(false);
                      }
                    }}
                  >
                    <img
                      src={i.imgs?.[0]}
                      className="h-14 w-14 rounded-sm object-cover"
                    />
                    <div className="ml-2 flex flex-grow flex-col justify-between overflow-hidden pr-4">
                      <div className="flex flex-col">
                        <span className="block truncate font-semibold">
                          {i.title}
                        </span>
                        {i.addon_groups ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {i.addon_groups?.map((j) => j.title).join(", ")}
                          </span>
                        ) : (
                          <span className="block truncate text-xs text-muted-foreground">
                            {i.description}
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatPrice(i.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

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
              <div className="flex h-full flex-col overflow-y-scroll pb-9">
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
                    <TableRow
                      onClick={() => {
                        if (deferredOrder?.phone) {
                          openPhoneLink(
                            deferredOrder?.phone,
                            TEXT_TEMPLATE.replace("{name}", deferredOrder?.name)
                              .replace("{pos}", pos?.name)
                              .replace(
                                "{order_number}",
                                padNumber(deferredOrder?.temp_count)
                              )
                          );
                        }
                      }}
                    >
                      <TableCell>Handphone</TableCell>
                      <TableCell className="text-right">
                        {deferredOrder?.phone && (
                          <Phone className="mr-2 inline w-4 text-blue-600" />
                        )}
                        <span
                          className={cn(
                            !deferredOrder.phone && "text-muted-foreground"
                          )}
                        >
                          {deferredOrder?.phone || "Tidak tersedia"}
                        </span>
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
                      <div className="flex shrink-0 flex-row items-center overflow-hidden px-3 py-2 transition-colors hover:bg-zinc-50">
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
                <Table className="border-t border-muted">
                  <TableBody>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(totalWTax)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {deferredOrder?.status === "PENDING" ? (
                  <Form
                    method="post"
                    encType="multipart/form-data"
                    onSubmit={() => setSelectedOrderId(null)}
                    className="mt-4 flex w-full flex-row gap-2 px-2"
                  >
                    <Input
                      type="hidden"
                      name="order_id"
                      value={deferredOrder?.id}
                    />
                    <Button
                      type="button"
                      variant={"secondary"}
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
                    className="mt-4 flex w-full flex-row gap-2 px-2"
                  >
                    <Input
                      type="hidden"
                      name="order_id"
                      value={deferredOrder?.id}
                    />
                    <Button
                      type="button"
                      variant={"secondary"}
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
                      className="mt-4 flex w-full flex-row gap-2 px-2"
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
