import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from "@/constants/max-file-size";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { ulid } from "ulid";
import { Input } from "./input";
import { Label } from "./label";

export function FileInput({ children, ...props }: any) {
  const [invalid, setInvalid] = useState<string | null>(null);
  const key = useMemo(() => `file_input_${ulid()}`, []);

  return (
    <div
      className={cn(
        "flex flex-row items-center gap-3 overflow-hidden rounded-md border",
        invalid && "border-red-400",
        props.className
      )}
    >
      <Label
        htmlFor={key}
        className={cn(
          "flex-grow whitespace-nowrap pl-5",
          invalid && "text-red-500"
        )}
      >
        {!invalid ? (
          children
        ) : (
          <span className="text-xs">
            File terlalu besar ({invalid}MB), Maks {MAX_FILE_SIZE_LABEL}
          </span>
        )}
      </Label>
      <Input
        {...props}
        id={key}
        type="file"
        className={cn(
          "flex max-w-[40%] flex-col items-center border-0 px-0 text-background"
        )}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > MAX_FILE_SIZE) {
            e.target.value = "";
            setInvalid((file.size / (1024 * 1024)).toFixed(2));
          } else {
            setInvalid(null);
          }
        }}
      />
    </div>
  );
}
