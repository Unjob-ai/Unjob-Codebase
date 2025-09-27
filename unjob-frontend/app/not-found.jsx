import ErrorFallback from "@/components/ErrorFallback";

export default function NotFound() {
  return (
    <ErrorFallback 
      errorType="notFound"
      statusCode={404}
    />
  );
}