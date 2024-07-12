export function safeJSON(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.log("Failed to stringify object", obj, error);
    return null;
  }
}
