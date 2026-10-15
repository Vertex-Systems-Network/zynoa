import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarFallback } from "../src/index";

const meta = { title: "Components/Avatar", component: Avatar } satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarFallback>SN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>BK</AvatarFallback>
      </Avatar>
    </div>
  ),
};
