import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "../src/index";

const meta = { title: "Components/Skeleton", component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LoadingCard: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
};
