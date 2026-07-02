import { Redirect } from "wouter";

export default function SignUp() {
  return <Redirect to="/auth?mode=register" />;
}