import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export async function loader({ params }: LoaderFunctionArgs) {
  const { posId } = params;
  throw redirect(`/${posId}/menu`);
}
