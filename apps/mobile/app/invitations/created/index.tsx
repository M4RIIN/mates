import { Redirect } from "expo-router";

export default function CreatedInvitationsRoute() {
  return <Redirect href={{ pathname: "/sorties", params: { filter: "created" } }} />;
}
