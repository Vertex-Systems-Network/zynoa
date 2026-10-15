// @vitest-environment jsdom
/** Every WU-P0-10 component renders with token-based styling hooks. */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/index";

afterEach(cleanup);

describe("static components", () => {
  it("Button renders variants and is focusable", () => {
    render(<Button variant="primary">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toContain("focus-visible:");
    expect(button.className).toContain("bg-brand-primary");
  });

  it("Button danger variant uses status tokens", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-status-danger");
  });

  it("Input renders with a visible focus ring class", () => {
    render(<Input aria-label="Email" placeholder="you@example.com" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.className).toContain("focus-visible:");
  });

  it("Badge renders its variant", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active").className).toContain("bg-status-success-subtle");
  });

  it("Card composes header and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "Usage" })).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("Table composes semantic table markup", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Zynoa</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Zynoa" })).toBeTruthy();
  });

  it("Avatar falls back to initials", () => {
    render(
      <Avatar>
        <AvatarFallback>ZY</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("ZY")).toBeTruthy();
  });

  it("EmptyState renders title, description and action", () => {
    render(
      <EmptyState
        title="No projects yet"
        description="Create your first project to get started."
        action={<Button>Create project</Button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "No projects yet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create project" })).toBeTruthy();
  });

  it("Skeleton is hidden from assistive technology", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const skeleton = container.firstElementChild;
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
    expect(skeleton?.className).toContain("animate-pulse");
  });
});
