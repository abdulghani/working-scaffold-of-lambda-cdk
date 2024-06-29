import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
import { Form, useLoaderData } from "@remix-run/react";
import { verifySession } from "app/service/auth";
import { validatePOSId } from "app/service/pos";
import {
  acknowledgeQueue,
  cancelQueue,
  getQueue,
  getQueueList,
  getQueueListHistory,
  queueCookie
} from "app/service/queue";
import { CircleCheck, CircleX, Phone } from "lucide-react";
import moment from "moment";
import { Fragment, useState } from "react";

const TEXT_TEMPLATE = `
Halo {name}, antrianmu sudah siap untuk {pax}.
Harap segera datang untuk menerima layanan.
Terima kasih.
`.trim();

export async function loader({ request, params }: LoaderFunctionArgs) {
  await verifySession?.(request);
  const cookie = await queueCookie.parse(request.headers.get("Cookie"));

  const [pos, list, queue, history] = await Promise.all([
    validatePOSId?.(params.posId!),
    getQueueList?.(params.posId!),
    getQueue?.(cookie?.id),
    getQueueListHistory?.(params.posId!)
  ]);

  return {
    queue: queue,
    queues: list,
    pos,
    history
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const payload = Object.fromEntries<any>(form.entries());

  if (payload._action === "acknowledge") {
    await acknowledgeQueue?.(payload.queue_id);
  } else if (payload._action === "cancel") {
    await cancelQueue?.(payload.queue_id);
  }

  return null;
}

export default function QueueAdmin() {
  const { queue, queues, pos, history } = useLoaderData<typeof loader>();
  const [actionDialog, setActionDialog] = useState<any>({});

  useRevalidation();

  return (
    <>
      <div className="flex w-screen justify-center">
        <Tabs defaultValue="list" className="mt-3 w-full lg:w-[400px]">
          <TabsList className="sticky top-3 z-10 mx-4 grid grid-cols-2">
            <TabsTrigger value="list">Antrian</TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <div className="flex flex-row items-center">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={pos.profile_img} />
                    <AvatarFallback>{pos.name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <CardTitle>Antrian {pos.name}</CardTitle>
                    <CardDescription>
                      {pos.description || "List antrian restoran"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
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
                    {queues.map((q, i) => (
                      <Fragment key={q.id}>
                        <TableRow
                          className={
                            q.id === queue?.id ? "bg-sky-50" : undefined
                          }
                          onClick={() =>
                            setActionDialog((prev: any) => ({
                              ...prev,
                              [`list-${q.id}`]: true
                            }))
                          }
                        >
                          <TableCell className="font-medium">
                            {formatQueueNumber(q.temp_count)}
                          </TableCell>
                          <TableCell>{q.name}</TableCell>
                          <TableCell>{q.pax}</TableCell>
                          <TableCell className="text-right">
                            {moment(q.created_at).fromNow()}
                          </TableCell>
                        </TableRow>
                        <Drawer
                          key={`list-${q.id}`}
                          open={actionDialog[`list-${q.id}`]}
                          onOpenChange={(e) =>
                            setActionDialog((prev: any) => ({
                              ...prev,
                              [`list-${q.id}`]: e
                            }))
                          }
                        >
                          <DrawerContent className="rounded-t-sm px-3">
                            <DrawerHeader>
                              <DrawerTitle>
                                Antrian {formatQueueNumber(q.temp_count)}
                              </DrawerTitle>
                              <DrawerDescription>
                                Terima antrian atau tolak antrian ini
                              </DrawerDescription>
                            </DrawerHeader>
                            <Table>
                              <TableRow>
                                <TableCell className="text-left">
                                  No antrian
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatQueueNumber(q.temp_count)}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">
                                  Nama
                                </TableCell>
                                <TableCell className="text-right">
                                  {q.name}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">PAX</TableCell>
                                <TableCell className="text-right">
                                  {q.pax}
                                </TableCell>
                              </TableRow>
                              <TableRow
                                onClick={() => {
                                  if (q.phone) {
                                    window.open(
                                      `https://wa.me/${q.phone}?text=${encodeURIComponent(TEXT_TEMPLATE.replace("{name}", q.name).replace("{pax}", `${q.pax} PAX`))}`
                                    );
                                  }
                                }}
                              >
                                <TableCell className="text-left">
                                  No handphone
                                </TableCell>
                                <TableCell className="text-right">
                                  {q.phone ? (
                                    <>
                                      <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-400" />
                                      <span>{q.phone}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Tidak tersedia
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">
                                  Waktu antrian
                                </TableCell>
                                <TableCell className="text-right">
                                  {moment(q.created_at).format(
                                    "ddd, DD MMM YYYY, HH:mm"
                                  )}
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    ({moment(q.created_at).fromNow()})
                                  </span>
                                </TableCell>
                              </TableRow>
                              <TableRow className="border-b-0">
                                <TableCell className="text-left">
                                  Status
                                </TableCell>
                                <TableCell className="text-right">
                                  {q.is_acknowledged
                                    ? "Diterima"
                                    : q.is_cancelled
                                      ? "Ditolak"
                                      : "Menunggu"}
                                </TableCell>
                              </TableRow>
                            </Table>
                            <Form
                              method="post"
                              onSubmit={() =>
                                setActionDialog((prev: any) => ({
                                  ...prev,
                                  [`list-${q.id}`]: false
                                }))
                              }
                            >
                              <Input
                                type="hidden"
                                name="queue_id"
                                value={q.id}
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
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <div className="flex flex-row items-center">
                  <div className="ml-3">
                    <CardTitle>Riwayat antrian</CardTitle>
                    <CardDescription>List riwayat antrian</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
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
                    {history.map((q, i) => (
                      <Fragment key={q.id}>
                        <TableRow
                          className={
                            q.id === queue?.id ? "bg-sky-50" : undefined
                          }
                          onClick={() =>
                            setActionDialog((prev: any) => ({
                              ...prev,
                              [`history-${q.id}`]: true
                            }))
                          }
                        >
                          <TableCell className="font-medium">
                            {formatQueueNumber(q.temp_count)}
                          </TableCell>
                          <TableCell>{q.name}</TableCell>
                          <TableCell>{q.pax}</TableCell>
                          <TableCell className="text-right">
                            {q.is_acknowledged
                              ? "Diterima"
                              : q.is_cancelled
                                ? "Ditolak"
                                : "Menunggu"}
                          </TableCell>
                        </TableRow>
                        <Drawer
                          key={`history-${q.id}`}
                          open={actionDialog[`history-${q.id}`]}
                          onOpenChange={(e) =>
                            setActionDialog((prev: any) => ({
                              ...prev,
                              [`history-${q.id}`]: e
                            }))
                          }
                        >
                          <DrawerContent className="rounded-t-sm px-3 pb-5">
                            <DrawerHeader>
                              <DrawerTitle>
                                Data antrian {formatQueueNumber(q.temp_count)}
                              </DrawerTitle>
                            </DrawerHeader>
                            <Table>
                              <TableRow>
                                <TableCell className="text-left">
                                  No antrian
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatQueueNumber(q.temp_count)}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">
                                  Nama
                                </TableCell>
                                <TableCell className="text-right">
                                  {q.name}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">PAX</TableCell>
                                <TableCell className="text-right">
                                  {q.pax}
                                </TableCell>
                              </TableRow>
                              <TableRow
                                onClick={() => {
                                  if (q.phone) {
                                    window.open(`https://wa.me/${q.phone}`);
                                  }
                                }}
                              >
                                <TableCell className="text-left">
                                  No handphone
                                </TableCell>
                                <TableCell className="text-right">
                                  {q.phone ? (
                                    <>
                                      <Phone className="-mt-0.5 mr-2.5 inline w-4 text-blue-400" />
                                      <span>{q.phone}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Tidak tersedia
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">
                                  Waktu antrian
                                </TableCell>
                                <TableCell className="text-right">
                                  {moment(q.created_at).format(
                                    "ddd, DD MMM YYYY, HH:mm"
                                  )}
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    ({moment(q.created_at).fromNow()})
                                  </span>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="text-left">
                                  Status
                                </TableCell>
                                <TableCell className="text-right">
                                  {q.is_acknowledged
                                    ? "Diterima"
                                    : q.is_cancelled
                                      ? "Ditolak"
                                      : "Menunggu"}
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {moment(q.updated_at).format("HH:mm")} (
                                    {moment(q.updated_at).fromNow()})
                                  </span>
                                </TableCell>
                              </TableRow>
                            </Table>
                          </DrawerContent>
                        </Drawer>
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
