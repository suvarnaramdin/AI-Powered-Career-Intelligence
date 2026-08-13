import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const loginUser = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await axios.post(`${API}/login`, form);

      localStorage.setItem("user", res.data.user);
      localStorage.setItem("email", res.data.email);

      if (remember) {
        localStorage.setItem("rememberUser", form.email);
      }

      if (res.data.role === "ADMIN") {
        localStorage.removeItem("user");
        alert("Admin login required. Please use the admin login page.");
        navigate("/admin/login");
        return;
      }

      alert("Login Successful");

      navigate("/dashboard");

    } catch (err) {

      alert(err.response?.data?.detail || "Login Failed");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

        <div className="text-center mb-8">

          <div className="text-6xl mb-4">
            🔐
          </div>

          <h1 className="text-3xl font-extrabold text-blue-700">
            Welcome Back
          </h1>

          <p className="text-gray-500 mt-2">
            Login to continue your AI Career Journey
          </p>

        </div>

        <form onSubmit={loginUser} className="space-y-5">

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
          />

          <div className="relative">

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border rounded-xl px-4 py-3 pr-20 focus:ring-2 focus:ring-blue-600 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-blue-600 font-semibold"
            >
              {showPassword ? "Hide" : "Show"}
            </button>

          </div>

          <div className="flex justify-between items-center text-sm">

            <label className="flex items-center gap-2">

              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />

              Remember Me

            </label>

            <button
              type="button"
              className="text-blue-600 hover:underline"
            >
              Forgot Password?
            </button>

          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold"
          >
            {loading ? "Signing In..." : "Login"}
          </button>

        </form>

        <div className="mt-6 text-center">

          <span className="text-gray-600">
            Don't have an account?
          </span>

          <Link
            to="/register"
            className="ml-2 text-blue-700 font-bold"
          >
            Register
          </Link>

        </div>

      </div>

    </div>
  );
}