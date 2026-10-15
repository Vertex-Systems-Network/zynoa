import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../src/index";

const meta = { title: "Components/Tooltip", component: Tooltip } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost">Credits</Button>
        </TooltipTrigger>
        <TooltipContent>1 credit = one standard model call</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
