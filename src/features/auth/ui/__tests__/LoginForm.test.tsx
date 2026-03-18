import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mocks ----

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: pushMock, refresh: refreshMock })),
}));

const loginMock = vi.fn();
vi.mock("@features/auth/lib/usecases/login", () => ({
  loginWithPassword: (...args: unknown[]) => loginMock(...args),
}));

// ---- import after mocks ----
import LoginForm from "../LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginMock.mockResolvedValue(undefined);
  });

  it("renders username and password fields and a submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Enter your username")).toBeInTheDocument();
    });
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("calls loginWithPassword and navigates on successful submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        username: "admin",
        password: "secret123",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows an error message when login fails", async () => {
    loginMock.mockRejectedValue(new Error("Invalid credentials"));

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    expect(pushMock).not.toHaveBeenCalled();
  });
});
