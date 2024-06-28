import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatQueueNumber } from "@/lib/format-queue-number";
import { useRevalidation } from "@/lib/use-revalidation";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { verifySession } from "app/service/auth";
import { validatePOSId } from "app/service/pos";
import {
  acknowledgeQueue,
  cancelQueue,
  getQueue,
  getQueueList,
  queueCookie
} from "app/service/queue";
import { CircleCheck, CircleX, Phone, PhoneMissed } from "lucide-react";
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
  const { queue, queues, pos } = useLoaderData<any>();
  const [actionDialog, setActionDialog] = useState<any>({});

  useRevalidation();

  return (
    <>
      <div className="flex w-screen justify-center">
        <Card className="w-full border-0 pt-2 shadow-none lg:w-[400px]">
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
                      className={q.id === queue?.id ? "bg-sky-50" : undefined}
                      onClick={() =>
                        setActionDialog((prev: any) => ({
                          ...prev,
                          [q.id]: true
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
                    <Sheet
                      key={q.id}
                      open={actionDialog[q.id]}
                      onOpenChange={(e) =>
                        setActionDialog((prev: any) => ({
                          ...prev,
                          [q.id]: e
                        }))
                      }
                    >
                      <SheetContent side={"bottom"} className="pb-8">
                        <SheetHeader>
                          <SheetTitle>Terima atau Tolak Antrian</SheetTitle>
                          <SheetDescription>
                            Terima antrian atau tolak antrian ini
                          </SheetDescription>
                          <SheetFooter className="flex flex-row items-center">
                            {q.phone ? (
                              <Link
                                className="w-full"
                                to={`https://wa.me/${q.phone}?text=${encodeURIComponent(TEXT_TEMPLATE.replace("{name}", q.name).replace("{pax}", `${q.pax} PAX`))}`}
                                target="_blank"
                              >
                                <Button className="w-full" variant={"outline"}>
                                  <Phone className="mr-2.5 w-4 text-blue-400" />
                                  {q.name}, {q.pax} PAX
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                className="w-full"
                                variant="outline"
                                disabled
                              >
                                <PhoneMissed className="mr-2.5 w-4" />
                                {q.name}, {q.pax} PAX
                              </Button>
                            )}
                          </SheetFooter>
                          <Form
                            method="post"
                            onSubmit={() =>
                              setActionDialog((prev: any) => ({
                                ...prev,
                                [q.id]: false
                              }))
                            }
                          >
                            <Input type="hidden" name="queue_id" value={q.id} />
                            <SheetFooter className="mt-0 flex flex-row items-center">
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
                            </SheetFooter>
                          </Form>
                        </SheetHeader>
                      </SheetContent>
                    </Sheet>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
