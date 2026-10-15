import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/index";

const meta = { title: "Components/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="approvals">Approvals</TabsTrigger>
        <TabsTrigger value="failures">Failures</TabsTrigger>
      </TabsList>
      <TabsContent value="all">Everything in your inbox.</TabsContent>
      <TabsContent value="approvals">Approvals waiting on you.</TabsContent>
      <TabsContent value="failures">Failed runs to review.</TabsContent>
    </Tabs>
  ),
};
