import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const registerUser = async (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API}/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      alert(res.data.message);

      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.detail || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

        <div className="text-center mb-8">

          <div className="text-6xl mb-4">🤖</div>

          <h1 className="text-3xl font-extrabold text-blue-700">
            AI Career Intelligence
          </h1>

          <p className="text-gray-500 mt-2">
            Create your account to begin your career journey.
          </p>

        </div>

        <form onSubmit={registerUser} className="space-y-5">

          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
          />

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
              placeholder="Password (Minimum 8 Characters)"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border rounded-xl px-4 py-3 pr-20 focus:ring-2 focus:ring-blue-600 outline-none"
            />

            <button
              type="button"
              className="absolute right-4 top-3 text-blue-600 font-semibold"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>

          </div>

          <input
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-xl font-semibold"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>

        </form>

        <div className="mt-6 text-center">

          <span className="text-gray-600">
            Already have an account?
          </span>

          <Link
            to="/login"
            className="ml-2 text-blue-700 font-bold"
          >
            Login
          </Link>

        </div>

      </div>

    </div>
  );
}