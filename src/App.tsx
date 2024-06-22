import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { Button } from "@/components/ui/button";

function App() {
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
      <h1 className="mb-2 text-lg">Vite + React</h1>
      <div className="flex flex-col items-center">
        <Button
          onClick={() => setCount((count) => count + 1)}
          className="mb-2"
          variant="default"
          size="default"
        >
          count is {count}
        </Button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
