import { useRouteError, Link } from "react-router";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="error-page" style={{ textAlign: "center", padding: "50px", fontFamily: "sans-serif" }}>
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error?.statusText || error?.message || "Page Not Found"}</i>
      </p>
      <Link to="/login" style={{ display: "inline-block", marginTop: "20px", padding: "10px 20px", backgroundColor: "#007bff", color: "white", textDecoration: "none", borderRadius: "5px" }}>
        Go to Login
      </Link>
    </div>
  );
}
