import { Redirect } from "expo-router";

export default function ReceivedInvitationsRoute() {
  return <Redirect href={{ pathname: "/sorties", params: { filter: "received" } }} />;
}
