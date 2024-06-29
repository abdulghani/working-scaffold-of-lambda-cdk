import { Button } from "@/components/ui/button";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { verifySession } from "app/service/auth";
import { useState } from "react";
import reactLogo from "../../public/react.svg?url";
import viteLogo from "../../public/vite.svg?url";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await verifySession?.(request);

  return { userId };
}

export default function Root() {
  const { userId } = useLoaderData<any>();
  const [count, setCount] = useState(0);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-800">
      <div className="mb-2 flex flex-col items-center">
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="mb-3 w-20" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="w-20" alt="React logo" />
        </a>
      </div>
      <h1 className="mb-2 text-lg text-gray-50">Vite + React {userId}</h1>
      <div className="flex flex-col items-center">
        <Button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </Button>
        <p className="text-gray-50">
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs text-gray-50">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}
