import { redirect } from "next/navigation";

/** Phase 0: no auth or workspace resolution yet — land on the demo workspace. */
export default function Index() {
  redirect("/w/demo");
}
