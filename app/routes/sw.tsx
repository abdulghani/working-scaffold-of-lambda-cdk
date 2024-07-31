import packageJSON from "../../package.json";
import RAW_SW from "../sw.js?raw";

const SW_SCRIPT = RAW_SW.replaceAll("{{version}}", packageJSON.version).trim();

export async function loader() {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript"
    }
  });
}
