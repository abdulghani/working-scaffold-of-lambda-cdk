import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatQueueNumber } from "@/lib/format-queue-number";
import { parsePhone } from "@/lib/parse-phone";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { validatePOSId } from "app/service/pos";
import {
  QUEUE_ENUM,
  addQueue,
  getQueue,
  getQueueList,
  queueCookie,
  userCancelQueue
} from "app/service/queue";
import { CircleCheck, CircleX, Timer } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";

export const loader = wrapActionError(async function ({
  request,
  params
}: LoaderFunctionArgs) {
  const cookie = await queueCookie.parse(request.headers.get("Cookie"));

  const [pos, list, queue] = await Promise.all([
    validatePOSId?.(params.posId!),
    getQueueList?.(params.posId!),
    getQueue?.(cookie?.id)
  ]);

  return {
    queue: queue,
    queues: list,
    pos
  };
});

export const action = wrapActionError(async function ({
  request,
  params
}: ActionFunctionArgs) {
  const { posId } = params;
  const payload = await request.formData().then(Object.fromEntries);
  const queue = await queueCookie.parse(request.headers.get("Cookie"));

  if (payload.cancel === "true") {
    if (
      queue?.id &&
      /** IGNORE ALREADY ACKNOWLEDGED QUEUE */
      ![QUEUE_ENUM.ACKNOWLEDGED, QUEUE_ENUM.CANCELLED].includes(queue.status) &&
      posId === queue?.pos_id
    ) {
      await userCancelQueue?.(queue.id as string);
    }
    throw redirect(`/queue/${posId}`, {
      headers: {
        "Set-Cookie": await queueCookie.serialize("", { maxAge: 0 })
      }
    });
  }

  const newQueue = await addQueue?.({
    name: payload.name,
    pax: payload.pax,
    phone: payload.phone,
    posId
  });

  throw redirect(`/queue/${posId}`, {
    headers: {
      "Set-Cookie": await queueCookie.serialize(newQueue)
    }
  });
});

export default function Queue() {
  const action = useActionData<any>();
  const { queue, queues, pos } = useLoaderData<any>();
  const [cancelDialog, setCancelDialog] = useState(false);

  return (
    <>
      <div className="flex w-screen justify-center">
        <Tabs defaultValue="list" className="mt-3 w-full lg:w-[400px]">
          <TabsList className="sticky top-3 z-10 mx-4 grid grid-cols-2">
            <TabsTrigger value="list">Antrian</TabsTrigger>
            <TabsTrigger value="input">
              <span>Antri</span>
              {queue?.id && <Timer className="ml-1.5 h-4 w-4" />}
            </TabsTrigger>
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
                    <CardTitle>{pos.name}</CardTitle>
                    <CardDescription>
                      Antrian {pos.description || "List antrian restoran"}
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
                      <TableRow
                        key={q.id}
                        className={q.id === queue?.id ? "bg-sky-50" : undefined}
                      >
                        <TableCell className="font-medium">
                          {formatQueueNumber(q.temp_count)}
                        </TableCell>
                        <TableCell>{q.name}</TableCell>
                        <TableCell>{q.pax}</TableCell>
                        <TableCell className="text-right">
                          {DateTime.fromISO(q.created_at).toRelative()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="input">
            <Card className="border-0 shadow-none">
              {queue?.status === QUEUE_ENUM.PENDING ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex flex-row items-center">
                      Antrian no {formatQueueNumber(queue.temp_count)}
                      <Timer className="ml-2 h-5 w-5 text-orange-500" />
                    </CardTitle>
                    <CardDescription>
                      Anda sudah mengantri atas nama {queue.name} (untuk{" "}
                      {queue.pax} orang)
                    </CardDescription>
                    <CardDescription>
                      {new Date(queue.created_at).toLocaleString()} (
                      {DateTime.fromISO(queue.created_at).toRelative()})
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <AlertDialog
                      open={cancelDialog}
                      onOpenChange={setCancelDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="outline">
                          Batalkan antrian
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-sm py-8">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Apakah Anda yakin?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Antrian akan dibatalkan dan tidak bisa dikembalikan
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Form
                          method="post"
                          className="w-full"
                          onSubmit={() => setCancelDialog(false)}
                        >
                          <AlertDialogFooter className="flex flex-row items-center justify-center">
                            <AlertDialogAction
                              type="submit"
                              name="cancel"
                              value="true"
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
                  </CardFooter>
                </>
              ) : queue?.status === QUEUE_ENUM.ACKNOWLEDGED ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex flex-row items-center">
                      Antrian sudah diterima
                      <CircleCheck className="ml-2 h-5 w-5 text-green-500" />
                    </CardTitle>
                    <CardDescription>
                      Antrian Anda diterima oleh pihak restoran, segera datang
                      untuk menerima pelayanan.
                    </CardDescription>
                    <CardDescription>
                      {[queue.name, queue.phone, `${queue.pax} PAX`]
                        .filter(Boolean)
                        .join(", ")}
                    </CardDescription>
                    <CardDescription>
                      {DateTime.fromISO(queue.updated_at).toRelative()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <AlertDialog
                      open={cancelDialog}
                      onOpenChange={setCancelDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="outline">
                          Buat antrian baru
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-sm py-8">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Apakah Anda yakin?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Antrian akan dihapus dan tidak bisa dikembalikan
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Form
                          method="post"
                          className="w-full"
                          onSubmit={() => {
                            setCancelDialog(false);
                          }}
                        >
                          <AlertDialogFooter className="flex flex-row items-center justify-center">
                            <AlertDialogAction
                              type="submit"
                              name="cancel"
                              value="true"
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
                  </CardFooter>
                </>
              ) : queue?.status === QUEUE_ENUM.CANCELLED ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex flex-row items-center">
                      Antrian dibatalkan
                      <CircleX className="ml-2 h-5 w-5 text-red-500" />
                    </CardTitle>
                    <CardDescription>
                      Antrian dibatalkan oleh pihak restoran, karena tidak
                      berada ditempat saat antrian diterima.
                    </CardDescription>
                    <CardDescription>
                      {[queue.name, queue.phone, `${queue.pax} PAX`]
                        .filter(Boolean)
                        .join(", ")}
                    </CardDescription>
                    <CardDescription>
                      {DateTime.fromISO(queue.created_at).toRelative()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <AlertDialog
                      open={cancelDialog}
                      onOpenChange={setCancelDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button className="w-full" variant="outline">
                          Buat antrian baru
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-sm py-8">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Apakah Anda yakin?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Antrian akan dihapus dan tidak bisa dikembalikan
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Form
                          method="post"
                          className="w-full"
                          onSubmit={() => {
                            setCancelDialog(false);
                          }}
                        >
                          <AlertDialogFooter className="flex flex-row items-center justify-center">
                            <AlertDialogAction
                              type="submit"
                              name="cancel"
                              value="true"
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
                  </CardFooter>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Antri</CardTitle>
                    <CardDescription>Masukan data antrian Anda</CardDescription>
                  </CardHeader>
                  <Form method="post">
                    <CardContent className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="name">
                          Nama{" "}
                          {action?.error?.details?.name && (
                            <span className="font-normal text-red-600">
                              ({action.error.details.name})
                            </span>
                          )}
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          className={`capitalize ${action?.error?.details?.name && "border-red-400"}`}
                          placeholder="Nama Anda"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pax">
                          Jumlah orang (PAX){" "}
                          {action?.error?.details?.pax && (
                            <span className="font-normal text-red-600">
                              ({action.error.details.pax})
                            </span>
                          )}
                        </Label>
                        <Input
                          id="pax"
                          name="pax"
                          type="number"
                          inputmode="numeric"
                          required
                          min={1}
                          max={100}
                          placeholder="Jumlah orang yang datang"
                          className={
                            action?.error?.details?.pax && "border-red-400"
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone">
                          No Handphone{" "}
                          {action?.error?.details?.phone && (
                            <span className="font-normal text-red-600">
                              ({action.error.details.phone})
                            </span>
                          )}
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="text"
                          min={8}
                          inputMode="numeric"
                          placeholder="No Handphone Anda"
                          className={`${action?.error?.details?.phone && "border-red-400"}`}
                          onChange={(e) => {
                            e.target.value = parsePhone(e.target.value);
                          }}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" type="submit">
                        Antri
                      </Button>
                    </CardFooter>
                  </Form>
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
