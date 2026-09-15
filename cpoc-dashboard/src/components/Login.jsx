import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [authorityId, setAuthorityId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    if (!authorityId.trim() || !password.trim()) {
      setError("AUTHORITY ID AND PASSWORD ARE REQUIRED.");
      return;
    }

    setLoading(true);

    // Temporary authentication
    // Replace this later with the real backend authentication.
    setTimeout(() => {
      setLoading(false);

      if (onLogin) {
        onLogin();
      }
    }, 700);
  };

  return (
    <div className="cpoc-login">

      {/* Background decoration */}
      <div className="login-grid" />
      <div className="login-glow" />

      <div className="login-wrapper">

        {/* BRAND */}

        <header className="login-brand">

          <div className="login-logo">
            U
          </div>

          <h1>UNIRES</h1>

          <p>CPOC OPERATIONS CONSOLE</p>

        </header>


        {/* LOGIN CARD */}

        <section className="login-panel">

          {/* Panel header */}

          <div className="login-panel-header">

            <div className="login-eyebrow">
              AUTHORITY ACCESS
            </div>

            <h2>Sign in to CPOC</h2>

            <p>
              Authorized personnel only.
              Access is monitored and logged.
            </p>

          </div>


          {/* System status */}

          <div className="login-status">

            <span className="login-status-dot" />

            <span>SYSTEM ONLINE</span>

            <span className="login-separator">•</span>

            <span>MESH CONNECTED</span>

          </div>


          {/* FORM */}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {/* Authority ID */}

            <div className="login-form-group">

              <label htmlFor="authorityId">
                AUTHORITY ID
              </label>

              <input
                id="authorityId"
                type="text"
                value={authorityId}
                onChange={(event) =>
                  setAuthorityId(event.target.value)
                }
                placeholder="Enter authority ID"
                autoComplete="username"
              />

            </div>


            {/* Password */}

            <div className="login-form-group">

              <label htmlFor="password">
                PASSWORD
              </label>

              <div className="login-password">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="login-show-password"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>

              </div>

            </div>


            {/* Error */}

            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}


            {/* Submit */}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "AUTHENTICATING..."
                : "SIGN IN"}
            </button>

          </form>


          {/* Panel footer */}

          <div className="login-panel-footer">

            <span>AUTHORIZED ACCESS ONLY</span>

            <span>•</span>

            <span>UNIRES</span>

            <span>•</span>

            <span>CPOC</span>

          </div>

        </section>


        {/* Security indicators */}

        <div className="login-security">

          <div>
            <span className="security-dot" />
            SYSTEM ONLINE
          </div>

          <div>
            <span className="security-dot" />
            ENCRYPTED SESSION
          </div>

          <div>
            <span className="security-dot" />
            MESH CONNECTED
          </div>

        </div>


        <div className="login-security-note">
          AUTHORIZED ACCESS • ACTIVITY MONITORED • SECURE SESSION
        </div>

      </div>
    </div>
  );
}

export default Login;