export function formatQueueNumber(queueNumber: number) {
  if (String(queueNumber).length >= 3) {
    return String(queueNumber);
  }
  return String(queueNumber).padStart(3, "0");
}
