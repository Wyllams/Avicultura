import { getFarms } from "@/app/actions/farm";
import { GranjasList } from "./GranjasList";

export default async function GranjasListPage() {
  const farms = await getFarms();

  return (
    <GranjasList farms={farms} />
  );
}
