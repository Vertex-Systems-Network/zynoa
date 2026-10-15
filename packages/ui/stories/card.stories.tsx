import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../src/index";

const meta = { title: "Components/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Spend this month</CardTitle>
        <CardDescription>Workspace AI usage across all projects.</CardDescription>
      </CardHeader>
      <CardContent>No usage yet.</CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm">
          View details
        </Button>
      </CardFooter>
    </Card>
  ),
};
