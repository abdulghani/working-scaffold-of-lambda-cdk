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
import { Textarea } from "@/components/ui/textarea";
import { useRevalidation } from "@/hooks/use-revalidation";
import { wrapActionError } from "@/lib/action-error";
import { padNumber } from "@/lib/pad-number";
import { parsePhone } from "@/lib/parse-phone";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation
} from "@remix-run/react";
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
import { useMemo, useState } from "react";

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
      await userCancelQueue?.(queue.id as string, payload.notes);
    }
    throw redirect(`/${posId}/queue`, {
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

  throw redirect(`/${posId}/queue`, {
    headers: {
      "Set-Cookie": await queueCookie.serialize(newQueue)
    }
  });
});

export default function Queue() {
  const action = useActionData<any>();
  const navigation = useNavigation();
  const { queue, queues, pos } = useLoaderData<any>();
  const [cancelDialog, setCancelDialog] = useState(false);
  useRevalidation();

  const isLoading = useMemo(() => {
    return navigation.state === "submitting";
  }, [navigation.state]);

  return (
    <>
      <div className="flex w-screen justify-center">
        <Tabs defaultValue="list" className="mt-3 w-full">
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
                      Antrian {pos.description || pos.name}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <div className="px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2">#</TableHead>
                    <TableHead className="px-2">Name</TableHead>
                    <TableHead className="px-2">PAX</TableHead>
                    <TableHead className="px-2 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues.map((q, i) => (
                    <TableRow
                      key={q.id}
                      className={q.id === queue?.id ? "bg-sky-50" : undefined}
                    >
                      <TableCell className="px-2 font-medium">
                        {padNumber(q.temp_count)}
                      </TableCell>
                      <TableCell className="px-2">{q.name}</TableCell>
                      <TableCell className="px-2">{q.pax}</TableCell>
                      <TableCell className="px-2 text-right">
                        {DateTime.fromISO(q.created_at).toRelative()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="input">
            <Card className="border-0 shadow-none">
              {queue?.status === QUEUE_ENUM.PENDING ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex flex-row items-center">
                      Antrian no {padNumber(queue.temp_count)}
                      <Timer className="ml-2 h-5 w-5 text-orange-500" />
                    </CardTitle>
                    <CardDescription>
                      Anda sudah mengantri atas nama {queue.name} (untuk{" "}
                      {queue.pax} orang)
                    </CardDescription>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="whitespace-nowrap px-2">
                            #
                          </TableCell>
                          <TableCell className="px-2 text-right">
                            {padNumber(queue.temp_count)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap px-2">
                            Nama
                          </TableCell>
                          <TableCell className="px-2 text-right">
                            {queue.name}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap px-2">
                            PAX
                          </TableCell>
                          <TableCell className="px-2 text-right">
                            {queue.pax}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap px-2">
                            Status
                          </TableCell>
                          <TableCell className="px-2 text-right">
                            {queue.status}
                          </TableCell>
                        </TableRow>
                        {queue.notes && (
                          <TableRow>
                            <TableCell className="whitespace-nowrap px-2">
                              Catatan
                            </TableCell>
                            <TableCell className="px-2 text-right">
                              {queue.notes}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="whitespace-nowrap px-2">
                            Waktu antrian
                          </TableCell>
                          <TableCell className="px-2 text-right">
                            <span>
                              {DateTime.fromISO(queue.created_at).toFormat(
                                "dd MMM yyyy, HH:mm ZZZZ"
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {DateTime.fromISO(queue.created_at).toRelative()}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => setCancelDialog(true)}
                    >
                      Batalkan antrian
                    </Button>
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
                      Antrian Anda diterima oleh pihak pedagang, segera datang
                      untuk menerima pelayanan.
                    </CardDescription>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">#</TableCell>
                          <TableCell className="text-right">
                            {padNumber(queue.temp_count)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Nama
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.name}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            PAX
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.pax}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Status
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.status}
                          </TableCell>
                        </TableRow>
                        {queue.notes && (
                          <TableRow>
                            <TableCell className="whitespace-nowrap">
                              Catatan
                            </TableCell>
                            <TableCell className="text-right">
                              {queue.notes}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Waktu antrian
                          </TableCell>
                          <TableCell className="text-right">
                            <span>
                              {DateTime.fromISO(queue.created_at).toFormat(
                                "dd MMM yyyy, HH:mm ZZZZ"
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {DateTime.fromISO(queue.created_at).toRelative()}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => setCancelDialog(true)}
                    >
                      Buat antrian baru
                    </Button>
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
                      Antrian dibatalkan oleh pihak pedagang.
                    </CardDescription>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">#</TableCell>
                          <TableCell className="text-right">
                            {padNumber(queue.temp_count)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Nama
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.name}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            PAX
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.pax}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Status
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.status}
                          </TableCell>
                        </TableRow>
                        {queue.notes && (
                          <TableRow>
                            <TableCell className="whitespace-nowrap">
                              Catatan
                            </TableCell>
                            <TableCell className="text-right">
                              {queue.notes}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          <TableCell className="whitespace-nowrap">
                            Waktu antrian
                          </TableCell>
                          <TableCell className="text-right">
                            <span>
                              {DateTime.fromISO(queue.created_at).toFormat(
                                "dd MMM yyyy, HH:mm ZZZZ"
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {DateTime.fromISO(queue.created_at).toRelative()}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => setCancelDialog(true)}
                    >
                      Buat antrian baru
                    </Button>
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
                          disabled={isLoading}
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
                          disabled={isLoading}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        type="submit"
                        disabled={isLoading}
                      >
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

      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent className="rounded-none py-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Antrian akan dibatalkan dan tidak bisa dikembalikan
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form
            method="post"
            className="w-full"
            onSubmit={() => setCancelDialog(false)}
          >
            {queue?.status === QUEUE_ENUM.PENDING && (
              <Textarea
                name="notes"
                placeholder="Alasan pembatalan"
                rows={2}
                className="mb-3"
              />
            )}
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
    </>
  );
}
