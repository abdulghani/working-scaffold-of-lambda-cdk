import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { openPhoneLink } from "@/lib/open-phone-link";
import { padNumber } from "@/lib/pad-number";
import { cn } from "@/lib/utils";
import { TabsContent } from "@radix-ui/react-tabs";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useOutletContext } from "@remix-run/react";
import {
  acknowledgeQueue,
  cancelQueue,
  getQueueList,
  getQueueListHistory,
  QUEUE_ENUM
} from "app/service/queue";
import {
  CircleCheck,
  CircleX,
  History,
  Phone,
  Trash,
  Users
} from "lucide-react";
import { DateTime } from "luxon";
import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { useDebouncedMenu } from "./admin.$posId";

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
  const [list, history] = await Promise.all([
    getQueueList?.(params.posId!),
    getQueueListHistory?.(params.posId!)
  ]);

  return {
    queues: list,
    history
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const payload = await request.formData().then(Object.fromEntries);

  if (payload._action === "acknowledge") {
    await acknowledgeQueue?.(payload.queue_id);
  } else if (payload._action === "cancel") {
    await cancelQueue?.(payload.queue_id, payload.notes);
  }

  return null;
}

export default function QueueAdmin() {
  const { pos } = useOutletContext<any>();
  const { queues, history } = useLoaderData<typeof loader>();
  const [selectedQueueId, setSelectedQueueId] = useState<any>(null);
  const [query, setQuery] = useState<string>("");
  const [cancelQueueId, setCancelQueueId] = useState<string | null>(null);

  /** DEBOUNCED STUFF */
  const selectedQueue = useMemo(
    () =>
      queues?.find((q) => q.id === selectedQueueId) ||
      history?.find((q) => q.id === selectedQueueId),
    [queues, history, selectedQueueId]
  );
  const selectedQueueDebounced = useDebouncedMenu(selectedQueue, 500);

  /** FILTERED STUFF */
  const queryDeferred = useDeferredValue(query);
  const [queuesFiltered, historyFiltered] = useMemo(() => {
    if (!queryDeferred?.trim()) {
      return [queues, history];
    }
    const regex = new RegExp(queryDeferred.replace(/^0/i, ""), "i");
    const queuesFiltered = queues?.filter(
      (q) =>
        regex.test(q.name) ||
        regex.test(padNumber(q.temp_count)) ||
        regex.test(q.phone)
    );
    const historyFiltered = history?.filter(
      (q) =>
        regex.test(q.name) ||
        regex.test(padNumber(q.temp_count)) ||
        regex.test(q.phone)
    );

    return [queuesFiltered, historyFiltered];
  }, [queues, history, queryDeferred]);

  return (
    <>
      <div className="flex w-screen justify-center">
        <Tabs defaultValue="list" className="mt-0 w-full lg:w-[400px]">
          <TabsList className="mx-3 mb-2 grid h-fit grid-cols-2">
            <TabsTrigger value="list">
              <Users className="mr-2 w-4" />
              Antrian ({queues?.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 w-4" />
              Riwayat ({history?.length})
            </TabsTrigger>
          </TabsList>
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
                placeholder="Cari antrian, nomor, nama"
                inputMode="search"
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
                  <TableHead>PAX</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queuesFiltered?.map((q) => (
                  <Fragment key={q.id}>
                    <TableRow onClick={() => setSelectedQueueId(q.id)}>
                      <TableCell className="font-medium">
                        {padNumber(q.temp_count)}
                      </TableCell>
                      <TableCell>{q.name}</TableCell>
                      <TableCell>{q.pax}</TableCell>
                      <TableCell className="text-right">
                        {DateTime.fromISO(q.created_at).toRelative()}
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
                placeholder="Cari antrian, nomor, nama"
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
                  <TableHead>PAX</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyFiltered?.map((q) => (
                  <Fragment key={q.id}>
                    <TableRow onClick={() => setSelectedQueueId(q.id)}>
                      <TableCell className="font-medium">
                        {padNumber(q.temp_count)}
                      </TableCell>
                      <TableCell>{q.name}</TableCell>
                      <TableCell>{q.pax}</TableCell>
                      <TableCell className="text-right">
                        {QUEUE_ENUM_LABEL[q.status]}
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      {/* LIST DRAWER */}
      <Drawer
        open={selectedQueueId && !cancelQueueId}
        onOpenChange={(e) => !e && !cancelQueueId && setSelectedQueueId(null)}
        disablePreventScroll={true}
      >
        <DrawerContent className="rounded-t-sm px-3 pb-5">
          <DrawerHandle />
          <div className="mt-1 flex w-full flex-col px-3">
            <div className="flex flex-row items-center text-xl">
              <span className="block font-semibold">
                Antrian no {padNumber(selectedQueueDebounced?.temp_count)}
              </span>
            </div>
            <div className="mb-1 text-sm text-muted-foreground">
              {selectedQueueDebounced?.status === QUEUE_ENUM.PENDING
                ? "Terima antrian atau tolak antrian ini"
                : "Detail antrian"}
            </div>
          </div>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="whitespace-nowrap px-2">#</TableCell>
                <TableCell className="px-2 text-right">
                  {padNumber(selectedQueueDebounced?.temp_count)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-nowrap px-2">Nama</TableCell>
                <TableCell className="px-2 text-right">
                  {selectedQueueDebounced?.name}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-nowrap px-2">PAX</TableCell>
                <TableCell className="px-2 text-right">
                  {selectedQueueDebounced?.pax}
                  {" Orang"}
                </TableCell>
              </TableRow>
              <TableRow
                onClick={() => {
                  if (selectedQueueDebounced?.phone) {
                    openPhoneLink(
                      selectedQueueDebounced?.phone,
                      TEXT_TEMPLATE.replace(
                        "{name}",
                        selectedQueueDebounced?.name
                      )
                        .replace("{pos}", pos.name)
                        .replace("{pax}", `${selectedQueueDebounced?.pax} PAX`)
                    );
                  }
                }}
              >
                <TableCell className="whitespace-nowrap px-2">
                  Handphone
                </TableCell>
                <TableCell className="px-2 text-right">
                  {selectedQueueDebounced?.phone ? (
                    <>
                      <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-600" />
                      <span>{selectedQueueDebounced?.phone}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Tidak tersedia
                    </span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-nowrap px-2">
                  Waktu antrian
                </TableCell>
                <TableCell className="px-2 text-right">
                  {DateTime.fromISO(
                    selectedQueueDebounced?.created_at
                  ).toFormat("ccc, dd MMM yyyy")}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (
                    {DateTime.fromISO(
                      selectedQueueDebounced?.created_at
                    ).toFormat("HH:mm ZZZZ")}
                    {", "}
                    {DateTime.fromISO(
                      selectedQueueDebounced?.created_at
                    ).toRelative()}
                    )
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="whitespace-nowrap px-2">Status</TableCell>
                <TableCell className="px-2 text-right">
                  {QUEUE_ENUM_LABEL[selectedQueueDebounced?.status]}
                </TableCell>
              </TableRow>
              {selectedQueueDebounced?.notes && (
                <TableRow className="border-b-0">
                  <TableCell className="whitespace-nowrap px-2">
                    Catatan
                  </TableCell>
                  <TableCell className="px-2 text-right">
                    {selectedQueueDebounced?.notes}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {selectedQueueDebounced?.status === "PENDING" && (
            <Form method="post" onSubmit={() => setSelectedQueueId(null)}>
              <Input
                type="hidden"
                name="queue_id"
                value={selectedQueueDebounced?.id}
              />
              <div className="mx-2 mt-2 flex flex-row items-center">
                <Button
                  className="mt-0 w-1/2"
                  variant={"secondary"}
                  type="button"
                  onClick={() => setCancelQueueId(selectedQueueDebounced?.id)}
                >
                  <CircleX className="mr-2 w-4" />
                  Tolak
                </Button>
                <Button
                  variant={"default"}
                  className="ml-3 mt-0 w-1/2"
                  type="submit"
                  name="_action"
                  value="acknowledge"
                >
                  <CircleCheck className="mr-2 w-4" />
                  Terima
                </Button>
              </div>
            </Form>
          )}
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={!!cancelQueueId}
        onOpenChange={(e) => !e && setCancelQueueId(null)}
      >
        <AlertDialogContent className="rounded-sm py-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Antrian akan dibatalkan dan tidak bisa dikembalikan
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form
            method="post"
            className="w-full"
            onSubmit={() => {
              setCancelQueueId(null);
              setSelectedQueueId(null);
            }}
          >
            <Input type="hidden" name="queue_id" value={cancelQueueId!} />
            <Textarea
              name="notes"
              placeholder="Alasan pembatalan"
              rows={2}
              className="mb-3"
            />
            <AlertDialogFooter className="flex flex-row items-center justify-center">
              <AlertDialogAction
                type="submit"
                name="_action"
                value="cancel"
                className="mr-3 w-1/2"
              >
                Hapus
              </AlertDialogAction>
              <AlertDialogCancel className="mt-0 w-1/2">
                Batal
              </AlertDialogCancel>
            </AlertDialogFooter>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
