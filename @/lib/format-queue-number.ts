export function formatQueueNumber(queueNumber: number) {
  if (String(queueNumber).length > 2) {
    return String(queueNumber);
  }
  return String(queueNumber).padStart(2, "0");
}
