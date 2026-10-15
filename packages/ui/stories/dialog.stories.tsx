import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../src/index";

const meta = { title: "Components/Dialog", component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Archive project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Archive this project?</DialogTitle>
        <DialogDescription>The project moves to the archive; nothing is deleted.</DialogDescription>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Archive</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
