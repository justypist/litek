import { type FC } from "react";

import * as uuid from 'uuid'
import { nanoid } from 'nanoid'

const Tool: FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm text-muted-foreground">Refresh the page to generate new UUID</span>
      <label>UUID Version 1</label>
      <span>{uuid.v1()}</span>
      <label>UUID Version 4</label>
      <span>{uuid.v4()}</span>
      <label>UUID Version 6</label>
      <span>{uuid.v6()}</span>
      <label>UUID Version 7</label>
      <span>{uuid.v7()}</span>
      <label>Nano ID</label>
      <span>{nanoid()}</span>
    </div>
  );
};

export default Tool;