import { NextResponse } from "next/server";

// Unknown API paths answer in JSON like the rest of the API. Without this
// they'd fall through to the page 404, which redirects to the homepage.
function missing() {
  return NextResponse.json({ error: "No such API route" }, { status: 404 });
}

export { missing as GET, missing as POST, missing as PUT, missing as PATCH, missing as DELETE };
