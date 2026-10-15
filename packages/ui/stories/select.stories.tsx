import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../src/index";

const meta = { title: "Components/Select", component: Select } satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-56">
      <Select>
        <SelectTrigger aria-label="Model mode">
          <SelectValue placeholder="Model mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fast">Fast</SelectItem>
          <SelectItem value="balanced">Balanced</SelectItem>
          <SelectItem value="best">Best quality</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
