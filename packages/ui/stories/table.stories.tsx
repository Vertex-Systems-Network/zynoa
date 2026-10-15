import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Badge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/index";

const meta = { title: "Components/Table", component: Table } satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Jobs: Story = {
  render: () => (
    <Table>
      <TableCaption>Recent AI jobs</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Credits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Generate landing copy</TableCell>
          <TableCell>
            <Badge variant="success">Done</Badge>
          </TableCell>
          <TableCell>12</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Render hero video</TableCell>
          <TableCell>
            <Badge variant="warning">Running</Badge>
          </TableCell>
          <TableCell>48</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
