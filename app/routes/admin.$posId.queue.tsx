import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
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
import { padNumber } from "@/lib/pad-number";
import { useRevalidation } from "@/lib/use-revalidation";
import { TabsContent } from "@radix-ui/react-tabs";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useOutletContext } from "@remix-run/react";
import {
  acknowledgeQueue,
  cancelQueue,
  getQueueList,
  getQueueListHistory
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
    await cancelQueue?.(payload.queue_id);
  }

  return null;
}

export default function QueueAdmin() {
  const { pos } = useOutletContext<any>();
  const { queues, history } = useLoaderData<typeof loader>();
  const [historyQueue, setHistoryQueue] = useState<any>(null);
  const [listQueue, setListQueue] = useState<any>(null);
  const [query, setQuery] = useState<string>("");

  /** DEBOUNCED STUFF */
  const historyQueueDebounced = useDebouncedMenu(historyQueue, 500);
  const listQueueDebounced = useDebouncedMenu(listQueue, 500);

  useRevalidation();

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
                    <TableRow onClick={() => setListQueue(q)}>
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
                    <TableRow onClick={() => setHistoryQueue(q)}>
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
        open={listQueue?.id}
        onOpenChange={(e) => setListQueue(e ? listQueue : null)}
        disablePreventScroll={true}
      >
        <DrawerContent className="rounded-t-sm px-3">
          <DrawerHeader>
            <DrawerTitle>
              Antrian {padNumber(listQueueDebounced?.temp_count)}
            </DrawerTitle>
            <DrawerDescription>
              Terima antrian atau tolak antrian ini
            </DrawerDescription>
          </DrawerHeader>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-left">No antrian</TableCell>
                <TableCell className="text-right">
                  {padNumber(listQueueDebounced?.temp_count)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">Nama</TableCell>
                <TableCell className="text-right">
                  {listQueueDebounced?.name}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">PAX</TableCell>
                <TableCell className="text-right">
                  {listQueueDebounced?.pax}
                  {" Orang"}
                </TableCell>
              </TableRow>
              <TableRow
                onClick={() => {
                  if (listQueueDebounced?.phone) {
                    const encoded = encodeURIComponent(
                      TEXT_TEMPLATE.replace("{name}", listQueueDebounced?.name)
                        .replace("{pos}", pos.name)
                        .replace("{pax}", `${listQueueDebounced?.pax} PAX`)
                    );
                    window.open(
                      `https://wa.me/${listQueueDebounced?.phone}?text=${encoded}`
                    );
                  }
                }}
              >
                <TableCell className="text-left">No handphone</TableCell>
                <TableCell className="text-right">
                  {listQueueDebounced?.phone ? (
                    <>
                      <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-400" />
                      <span>{listQueueDebounced?.phone}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Tidak tersedia
                    </span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">Waktu antrian</TableCell>
                <TableCell className="text-right">
                  {DateTime.fromISO(listQueueDebounced?.created_at).toFormat(
                    "ccc, dd MMM yyyy"
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (
                    {DateTime.fromISO(listQueueDebounced?.created_at).toFormat(
                      "HH:mm ZZZZ"
                    )}
                    {", "}
                    {DateTime.fromISO(
                      listQueueDebounced?.created_at
                    ).toRelative()}
                    )
                  </span>
                </TableCell>
              </TableRow>
              <TableRow className="border-b-0">
                <TableCell className="text-left">Status</TableCell>
                <TableCell className="text-right">
                  {QUEUE_ENUM_LABEL[listQueueDebounced?.status]}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Form method="post" onSubmit={() => setListQueue(null)}>
            <Input
              type="hidden"
              name="queue_id"
              value={listQueueDebounced?.id}
            />
            <div className="mx-2 mb-6 mt-2 flex flex-row items-center">
              <Button
                className="mt-0 w-1/2"
                variant={"outline"}
                type="submit"
                name="_action"
                value="cancel"
              >
                <CircleX className="mr-2 w-4 text-red-400" />
                Tolak
              </Button>
              <Button
                variant={"outline"}
                className="ml-3 mt-0 w-1/2"
                type="submit"
                name="_action"
                value="acknowledge"
              >
                <CircleCheck className="mr-2 w-4 text-green-400" />
                Terima
              </Button>
            </div>
          </Form>
        </DrawerContent>
      </Drawer>

      {/* HISTORY DRAWER */}
      <Drawer
        open={historyQueue?.id}
        onOpenChange={(e) => setHistoryQueue(e ? historyQueue : null)}
        disablePreventScroll={true}
      >
        <DrawerContent className="rounded-t-sm px-3 pb-5">
          <DrawerHeader>
            <DrawerTitle>
              Data antrian {padNumber(historyQueueDebounced?.temp_count)}
            </DrawerTitle>
          </DrawerHeader>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-left">No antrian</TableCell>
                <TableCell className="text-right">
                  {padNumber(historyQueueDebounced?.temp_count)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">Nama</TableCell>
                <TableCell className="text-right">
                  {historyQueueDebounced?.name}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">PAX</TableCell>
                <TableCell className="text-right">
                  {historyQueueDebounced?.pax}
                  {" Orang"}
                </TableCell>
              </TableRow>
              <TableRow
                onClick={() => {
                  if (historyQueueDebounced?.phone) {
                    window.open(
                      `https://wa.me/${historyQueueDebounced?.phone}`
                    );
                  }
                }}
              >
                <TableCell className="text-left">No handphone</TableCell>
                <TableCell className="text-right">
                  {historyQueueDebounced?.phone ? (
                    <>
                      <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-400" />
                      <span>{historyQueueDebounced?.phone}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Tidak tersedia
                    </span>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">Waktu antrian</TableCell>
                <TableCell className="text-right">
                  {DateTime.fromISO(historyQueueDebounced?.created_at).toFormat(
                    "ccc, dd MMM yyyy"
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (
                    {DateTime.fromISO(
                      historyQueueDebounced?.created_at
                    ).toFormat("HH:mm ZZZZ")}
                    {", "}
                    {DateTime.fromISO(
                      historyQueueDebounced?.created_at
                    ).toRelative()}
                    )
                  </span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-left">Status</TableCell>
                <TableCell className="text-right">
                  {QUEUE_ENUM_LABEL[historyQueueDebounced?.status]}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    (
                    {DateTime.fromISO(
                      historyQueueDebounced?.updated_at
                    ).toFormat("HH:mm ZZZZ")}
                    {", "}
                    {DateTime.fromISO(
                      historyQueueDebounced?.updated_at
                    ).toRelative()}
                    )
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DrawerContent>
      </Drawer>
    </>
  );
}
