import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import {
  addQueue,
  cancelQueue,
  getQueueList,
  queueCookie
} from "app/service/queue";
import moment from "moment";
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
import { useState } from "react";
import { validatePOSId } from "app/service/pos";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const pos = await validatePOSId?.(params.posId!);
  const list = await getQueueList?.(params.posId!);
  const cookie = await queueCookie.parse(request.headers.get("Cookie"));
  const queue = cookie ? JSON.parse(cookie) : null;

  return {
    queue: queue ? list?.find((q) => q.id === queue.id) : null,
    queues: list,
    pos
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { posId } = params;
  const form = await request.formData();
  const cancel = form.get("cancel");
  const cookie = await queueCookie.parse(request.headers.get("Cookie"));
  const queue = cookie ? JSON.parse(cookie) : null;

  if (cancel === "true" && queue?.id && posId === queue?.pos_id) {
    await cancelQueue?.(queue.id as string);
    throw redirect(`/queue/${params.posId}`, {
      headers: {
        "Set-Cookie": await queueCookie.serialize("")
      }
    });
  } else if (cancel === "true") {
    throw redirect(`/queue/${posId}`, {
      headers: {
        "Set-Cookie": await queueCookie.serialize("")
      }
    });
  }

  const name = form.get("name");
  const pax = form.get("pax");
  const phone = form.get("phone");
  const newQueue = await addQueue?.({
    name,
    pax,
    phone,
    posId
  });

  throw redirect(`/queue/${posId}`, {
    headers: {
      "Set-Cookie": await queueCookie.serialize(JSON.stringify(newQueue))
    }
  });
}

export default function Queue() {
  const { queue, queues, pos } = useLoaderData<any>();
  const [cancelDialog, setCancelDialog] = useState(false);

  return (
    <>
      <Tabs defaultValue="account" className="mt-3 w-[400px]">
        <TabsList className="sticky top-3 mx-4 grid grid-cols-2">
          <TabsTrigger value="account">Antrian</TabsTrigger>
          <TabsTrigger value="password">Antri</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Antrian {pos.name}</CardTitle>
              <CardDescription>List antrian restoran</CardDescription>
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
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{q.name}</TableCell>
                      <TableCell>{q.pax}</TableCell>
                      <TableCell className="text-right">
                        {moment(q.created_at).fromNow()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card className="border-0 shadow-none">
            {queue ? (
              <>
                <CardHeader>
                  <CardTitle>
                    Antrian no {queues.findIndex((q) => q.id === queue.id) + 1}
                  </CardTitle>
                  <CardDescription>
                    Anda sudah mengantri atas nama {queue.name} (untuk{" "}
                    {queue.pax} orang)
                  </CardDescription>
                  <CardDescription>
                    {new Date(queue.created_at).toLocaleString()} (
                    {moment(queue.created_at).fromNow()})
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
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apakah kamu yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Antrian akan dibatalkan dan tidak bisa dikembalikan
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Form
                        method="post"
                        className="w-full"
                        onSubmit={() => {
                          setCancelDialog(false);
                        }}
                      >
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <Button type="submit" name="cancel" value={"true"}>
                            Hapus
                          </Button>
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
                  <CardDescription>Masukan data antrian kamu</CardDescription>
                </CardHeader>
                <Form method="post">
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name">Nama</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={queue?.name}
                        disabled={!!queue}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pax">Jumlah orang (PAX)</Label>
                      <Input
                        id="pax"
                        name="pax"
                        type="number"
                        inputmode="numeric"
                        required
                        value={queue?.pax}
                        disabled={!!queue}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone">No Handphone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="number"
                        inputmode="numeric"
                        value={queue?.phone}
                        disabled={!!queue}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" type="submit" disabled={!!queue}>
                      Antri
                    </Button>
                  </CardFooter>
                </Form>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
