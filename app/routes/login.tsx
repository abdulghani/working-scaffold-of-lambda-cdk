import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wrapActionError } from "@/lib/action-error";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { otpFlowCookie, sendOTP, verifyOTP } from "app/service/auth";
import { Mail } from "lucide-react";

export function meta() {
  return [{ title: "Login" }];
}

export const loader = wrapActionError(async function ({
  request
}: LoaderFunctionArgs) {
  const searchParams = Object.fromEntries(
    new URLSearchParams(request.url.split("?")[1]).entries()
  );

  if (searchParams.clear_otp === "true") {
    throw redirect("/login", {
      headers: [
        ["Set-Cookie", await otpFlowCookie.serialize("", { maxAge: 0 })]
      ]
    });
  }

  const otpFlow = await otpFlowCookie.parse(request.headers.get("Cookie"));

  return { isOTP: !!otpFlow?.id, email: otpFlow?.email };
});

export const action = wrapActionError(async function ({
  request
}: ActionFunctionArgs) {
  const payload = await request.formData().then(Object.fromEntries);

  if (payload._action === "send_otp") {
    await sendOTP(payload.email);
  } else if (payload._action === "verify_otp") {
    await verifyOTP({ request, otpCode: payload.otp });
  }

  return {};
});

export default function Login() {
  const action = useActionData<any>();
  const { isOTP, email } = useLoaderData<any>();

  return (
    <div className="w-full">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Masuk ke akun Anda
            </p>
          </div>
          {isOTP ? (
            <Form className="grid gap-4" method="post">
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email{" "}
                  <span className="font-normal text-muted-foreground">
                    (Kode OTP telah dikirim)
                  </span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  required
                  disabled={isOTP}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="otp">
                  Kode OTP{" "}
                  {action?.error?.details?.otp && (
                    <span className="font-normal text-muted-foreground text-red-600">
                      ({action.error.details.otp})
                    </span>
                  )}
                </Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Kode OTP Anda"
                  autoComplete="one-time-code"
                  className={
                    action?.error?.details.otp ? "border-red-400" : undefined
                  }
                  required
                />
              </div>
              <Button
                type="submit"
                name="_action"
                value="verify_otp"
                variant={"default"}
                className="w-full"
              >
                Login
              </Button>
            </Form>
          ) : (
            <Form className="grid gap-4" method="post">
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email{" "}
                  {action?.error?.details?.email && (
                    <span className="font-normal text-muted-foreground text-red-600">
                      ({action.error.details.email})
                    </span>
                  )}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  placeholder="email-anda@resto.com"
                  autoComplete="email"
                  required
                  className={
                    action?.error?.details.email ? "border-red-400" : undefined
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                name="_action"
                value="send_otp"
              >
                <Mail className="mr-2.5 w-4" />
                Kirim kode OTP
              </Button>
            </Form>
          )}
          {!isOTP ? (
            <div className="mt-4 text-center text-sm">
              Tidak punya akun?{" "}
              <Link
                to="https://instagram.com/pranagacom"
                className="underline"
                target="_blank"
              >
                Ayo bergabung
              </Link>
            </div>
          ) : (
            <div className="mt-4 text-center text-sm">
              Mengalami kendala?{" "}
              <a href="?clear_otp=true" className="underline">
                Ulangi
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
