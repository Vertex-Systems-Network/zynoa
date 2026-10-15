// @vitest-environment jsdom
/** Keyboard interaction and focus behavior for the interactive components (WCAG 2.2 AA). */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../src/index";

afterEach(cleanup);

describe("Dialog", () => {
  function Example() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  it("opens from the keyboard and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Confirm" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("moves focus into the dialog when opened", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

describe("Sheet", () => {
  it("opens and closes as an accessible dialog", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Open sheet</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetTitle>Details</SheetTitle>
          <SheetDescription>Side panel</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByRole("button", { name: "Open sheet" }));
    expect(await screen.findByRole("dialog", { name: "Details" })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("Tabs", () => {
  it("switches tabs with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
      </Tabs>,
    );
    await user.tab();
    expect(screen.getByRole("tab", { name: "One" })).toBe(document.activeElement);
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Second panel")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("DropdownMenu", () => {
  it("opens with the keyboard and selects an item with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = { called: false };
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => {
              onSelect.called = true;
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem>Archive</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    const item = await screen.findByRole("menuitem", { name: "Rename" });
    expect(item).toBeTruthy();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onSelect.called).toBe(true));
  });
});

describe("Select", () => {
  it("opens with the keyboard and exposes options", async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="mango">Mango</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("option", { name: "Mango" })).toBeTruthy();
  });
});

describe("Tooltip", () => {
  it("shows on keyboard focus, not only on hover", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Info</Button>
          </TooltipTrigger>
          <TooltipContent>More information</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toBeTruthy();
  });
});

describe("Toast", () => {
  it("announces a toast politely and can be dismissed", async () => {
    const user = userEvent.setup();
    function Example() {
      return (
        <>
          <Button onClick={() => toast({ title: "Saved", description: "All changes stored." })}>
            Notify
          </Button>
          <Toaster />
        </>
      );
    }
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    const region = screen.getByRole("region", { name: /notifications/i });
    expect(region).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
  });
});
