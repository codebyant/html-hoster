import { useQuery } from "@tanstack/react-query";
import { getServerConfig } from "../../shared/api/client";
import { MAX_HTML_BYTES } from "../../shared/lib/validation";

export function useServerConfig() {
  const { data } = useQuery({
    queryKey: ["server-config"],
    queryFn: getServerConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return {
    maxFileSizeBytes: data ? data.max_file_size_mb * 1024 * 1024 : MAX_HTML_BYTES,
  };
}
