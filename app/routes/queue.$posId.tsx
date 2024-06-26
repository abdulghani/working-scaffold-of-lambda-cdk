import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
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
import { useEffect, useState } from "react";
import { validatePOSId } from "app/service/pos";
import { parsePhone } from "@/lib/parse-phone";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  if (cancel === "true") {
    if (queue?.id && posId === queue?.pos_id) {
      await cancelQueue?.(queue.id as string);
    }
    throw redirect(`/queue/${posId}`, {
      headers: {
        "Set-Cookie": await queueCookie.serialize("")
      }
    });
  }

  const newQueue = await addQueue?.({
    name: form.get("name"),
    pax: form.get("pax"),
    phone: form.get("phone"),
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
  const [phoneInput, setPhoneInput] = useState("");

  /** CLEANUP PHONE-INPUT AFTER FORM ACTION */
  useEffect(() => {
    setPhoneInput("");
  }, [queue]);

  return (
    <>
      <div className="flex w-screen justify-center">
        <Tabs defaultValue="list" className="mt-3 w-full lg:w-[400px]">
          <TabsList className="sticky top-3 mx-4 grid grid-cols-2">
            <TabsTrigger value="list">Antrian</TabsTrigger>
            <TabsTrigger value="input">Antri</TabsTrigger>
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
          <TabsContent value="input">
            <Card className="border-0 shadow-none">
              {queue ? (
                <>
                  <CardHeader>
                    <CardTitle>
                      Antrian no{" "}
                      {queues.findIndex((q) => q.id === queue.id) + 1}
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
                        <Label htmlFor="name">Nama</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          className="capitalize"
                          placeholder="Nama Anda"
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
                          max={100}
                          min={1}
                          placeholder="Jumlah orang yang datang"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone">No Handphone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="text"
                          inputMode="numeric"
                          value={phoneInput}
                          placeholder="No Handphone Anda"
                          onChange={(e) =>
                            setPhoneInput(parsePhone(e.target.value))
                          }
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
