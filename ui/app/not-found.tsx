import { redirect } from "next/navigation";

// There's nothing worth a 404 page here: a mistyped address or a tool that
// was renamed is better off on the homepage, which lists everything.
export default function NotFound() {
  redirect("/");
}
