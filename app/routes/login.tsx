import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import qrcode from "qrcode";
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { loginUser, redirectLoggedInUser } from "app/service/auth";
import { Form } from "@remix-run/react";

const QRIS_DATA =
  "00020101021226600013ID.CO.BRI.WWW0118936000020110576346021019993407260303UME5204541153033605405520005802ID5925FAMILYMART PURI MANSION P6013JAKARTA BARAT6105116106234011852650028880744696007081057634663049CD2";

export function meta() {
  return [{ title: "Login" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  await redirectLoggedInUser(request);

  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  await loginUser(email as string);

  return json({ email, password });
}

export default function Login() {
  const [qrImage, setQrImage] = React.useState<string | null>(null);

  useEffect(() => {
    qrcode
      .toDataURL(QRIS_DATA, {
        errorCorrectionLevel: "L",
        width: 1000,
        color: {
          light: "#00000000"
        }
      })
      .then((res) => setQrImage(res));
  }, []);

  return (
    <div className="max-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <Form className="grid gap-4" method="post">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="/forgot-password"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <a href="#" className="underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
      <div className="hidden h-screen w-full items-center bg-muted align-middle lg:flex">
        {qrImage && (
          <img src={qrImage} alt="QR Code" className="w-full object-contain" />
        )}
      </div>
    </div>
  );
}
