import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatQueueNumber } from "@/lib/format-queue-number";
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
  ClipboardList,
  FileClock,
  Phone
} from "lucide-react";
import { DateTime } from "luxon";
import { Fragment, useState } from "react";

const TEXT_TEMPLATE = `
Halo {name}, antrian {pos} sudah siap untuk {pax}.

Terima kasih.
`.trim();

const QUEUE_ENUM_LABEL: any = {
  PENDING: "Menunggu",
  ACKNOWLEDGED: "Diterima",
  CANCELLED: "Ditolak",
  USER_CANCELLED: "Dibatalkan pengguna"
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

  useRevalidation();

  return (
    <>
      <div className="flex w-screen justify-center">
        <Tabs
          defaultValue="list"
          className="mt-0 w-full overflow-x-hidden lg:w-[400px]"
        >
          <TabsList className="mx-3 mb-2 grid h-fit grid-cols-2">
            <TabsTrigger value="list">
              <ClipboardList className="mr-2 w-4" />
              Pesanan
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileClock className="mr-2 w-4" />
              Riwayat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-2 px-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>

                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queues?.map((q) => (
                      <Fragment key={q.id}>
                        <TableRow onClick={() => setListQueue(q)}>
                          <TableCell className="font-medium">
                            {formatQueueNumber(q.temp_count)}
                          </TableCell>
                          <TableCell>{q.name}</TableCell>
                          <TableCell className="text-right">
                            {DateTime.fromISO(q.created_at).toRelative()}
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history?.map((q) => (
                      <Fragment key={q.id}>
                        <TableRow onClick={() => setHistoryQueue(q)}>
                          <TableCell className="font-medium">
                            {formatQueueNumber(q.temp_count)}
                          </TableCell>
                          <TableCell>{q.name}</TableCell>
                          <TableCell className="text-right">
                            {QUEUE_ENUM_LABEL[q.status]}
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* LIST DRAWER */}
      {listQueue?.id && (
        <Drawer
          open={listQueue.id}
          onOpenChange={(e) => setListQueue(e ? listQueue : null)}
          disablePreventScroll={true}
        >
          <DrawerContent className="rounded-t-sm px-3">
            <DrawerHeader>
              <DrawerTitle>
                Antrian {formatQueueNumber(listQueue.temp_count)}
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
                    {formatQueueNumber(listQueue.temp_count)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-left">Nama</TableCell>
                  <TableCell className="text-right">{listQueue.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-left">PAX</TableCell>
                  <TableCell className="text-right">
                    {listQueue.pax}
                    {" Orang"}
                  </TableCell>
                </TableRow>
                <TableRow
                  onClick={() => {
                    if (listQueue.phone) {
                      const encoded = encodeURIComponent(
                        TEXT_TEMPLATE.replace("{name}", listQueue.name)
                          .replace("{pos}", pos.name)
                          .replace("{pax}", `${listQueue.pax} PAX`)
                      );
                      window.open(
                        `https://wa.me/${listQueue.phone}?text=${encoded}`
                      );
                    }
                  }}
                >
                  <TableCell className="text-left">No handphone</TableCell>
                  <TableCell className="text-right">
                    {listQueue.phone ? (
                      <>
                        <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-400" />
                        <span>{listQueue.phone}</span>
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
                    {DateTime.fromISO(listQueue.created_at).toFormat(
                      "ccc, dd MMM yyyy"
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      (
                      {DateTime.fromISO(listQueue.created_at).toFormat(
                        "HH:mm ZZZZ"
                      )}
                      {", "}
                      {DateTime.fromISO(listQueue.created_at).toRelative()})
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-b-0">
                  <TableCell className="text-left">Status</TableCell>
                  <TableCell className="text-right">
                    {QUEUE_ENUM_LABEL[listQueue.status]}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Form method="post" onSubmit={() => setListQueue(null)}>
              <Input type="hidden" name="queue_id" value={listQueue.id} />
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
      )}

      {/* HISTORY DRAWER */}
      {historyQueue?.id && (
        <Drawer
          open={historyQueue.id}
          onOpenChange={(e) => setHistoryQueue(e ? historyQueue : null)}
          disablePreventScroll={true}
        >
          <DrawerContent className="rounded-t-sm px-3 pb-5">
            <DrawerHeader>
              <DrawerTitle>
                Data antrian {formatQueueNumber(historyQueue.temp_count)}
              </DrawerTitle>
            </DrawerHeader>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-left">No antrian</TableCell>
                  <TableCell className="text-right">
                    {formatQueueNumber(historyQueue.temp_count)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-left">Nama</TableCell>
                  <TableCell className="text-right">
                    {historyQueue.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-left">PAX</TableCell>
                  <TableCell className="text-right">
                    {historyQueue.pax}
                    {" Orang"}
                  </TableCell>
                </TableRow>
                <TableRow
                  onClick={() => {
                    if (historyQueue.phone) {
                      window.open(`https://wa.me/${historyQueue.phone}`);
                    }
                  }}
                >
                  <TableCell className="text-left">No handphone</TableCell>
                  <TableCell className="text-right">
                    {historyQueue.phone ? (
                      <>
                        <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-400" />
                        <span>{historyQueue.phone}</span>
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
                    {DateTime.fromISO(historyQueue.created_at).toFormat(
                      "ccc, dd MMM yyyy"
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      (
                      {DateTime.fromISO(historyQueue.created_at).toFormat(
                        "HH:mm ZZZZ"
                      )}
                      {", "}
                      {DateTime.fromISO(historyQueue.created_at).toRelative()})
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-left">Status</TableCell>
                  <TableCell className="text-right">
                    {QUEUE_ENUM_LABEL[historyQueue.status]}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      (
                      {DateTime.fromISO(historyQueue.updated_at).toFormat(
                        "HH:mm ZZZZ"
                      )}
                      {", "}
                      {DateTime.fromISO(historyQueue.updated_at).toRelative()})
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
