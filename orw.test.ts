// orw.test.ts
import { describe, beforeEach, afterEach, test, expect, jest } from "bun:test";
import { OpenRouterAPIWatcher } from "./orw";
import { Database } from "bun:sqlite";
import type { Model, ModelDiff } from "./global";

describe("OpenRouterAPIWatcher", () => {
  let watcher: OpenRouterAPIWatcher;
  let db: Database;

  const dummyModel = {
    id: "1",
    name: "Model 1",
    description: "Description 1",
    pricing: {
      prompt: "0.01",
      completion: "0.02",
      request: "0.03",
      image: "0.04",
    },
    context_length: 1024,
    architecture: {
      modality: "text",
      tokenizer: "gpt2",
      instruct_type: null,
    },
    top_provider: {
      max_completion_tokens: 2048,
      is_moderated: true,
    },
    per_request_limits: null,
  };

  const otherModel: Model = {
    id: "2",
    name: "Model 2",
    description: "Description 2",
    pricing: {
      prompt: "0.01",
      completion: "0.02",
      request: "0.03",
      image: "0.04",
    },
    context_length: 1024,
    architecture: {
      modality: "text",
      tokenizer: "gpt2",
      instruct_type: null,
    },
    top_provider: {
      max_completion_tokens: 2048,
      is_moderated: true,
    },
    per_request_limits: null,
  };

  beforeEach(() => {
    // Silence console output
    console.log = jest.fn();
    console.error = jest.fn();
    db = new Database(":memory:");
    watcher = new OpenRouterAPIWatcher(db);
  });

  afterEach(() => {
    db.close();
  });

  test("should store and load model list", () => {
    const models: Model[] = [dummyModel];

    watcher.storeModelList(models, new Date());
    const loadedModels = watcher.loadModelList();

    expect(loadedModels).toEqual(models);
  });

  test("should store and load changes", () => {
    const changes: ModelDiff[] = [
      {
        id: "1",
        type: "changed",
        changes: {
          name: { old: "Model 1", new: "Model 1 Updated" },
        },
        timestamp: new Date().toISOString(),
      },
    ];

    watcher.storeChanges(changes);
    const loadedChanges = watcher.loadChanges(1);

    expect(loadedChanges).toEqual(changes);
  });

  test("should find changes between model lists", () => {
    const oldModels: Model[] = [dummyModel];

    const modifiedModel: Model = JSON.parse(JSON.stringify(dummyModel));
    modifiedModel.name = "Model 1 Updated";
    modifiedModel.architecture.instruct_type = "instruct";
    modifiedModel.top_provider.is_moderated = false;

    const newModels: Model[] = [modifiedModel];
    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([
      {
        id: "1",
        type: "changed",
        changes: {
          name: { old: "Model 1", new: "Model 1 Updated" },
          "architecture.instruct_type": { old: null, new: "instruct" },
          "top_provider.is_moderated": { old: true, new: false },
        },
        timestamp: expect.stringContaining("Z"),
      },
    ]);
  });

  test("should not report changes between identical model lists", () => {
    const oldModels: Model[] = [dummyModel];
    const newModels: Model[] = [dummyModel];
    const changes = watcher.findChanges(newModels, oldModels);
    expect(changes).toEqual([]);
  });

  test("should detect added models", () => {
    const oldModels: Model[] = [dummyModel];

    const newModels: Model[] = [dummyModel, otherModel];
    const changes = watcher.findChanges(newModels, oldModels);

    expect(changes).toEqual([
      {
        id: "2",
        type: "added",
        model: otherModel,
        timestamp: expect.stringContaining("Z"),
      },
    ]);
  });

  test("should detect removed models", () => {
    const oldModels: Model[] = [dummyModel, otherModel];
    const newModels: Model[] = [dummyModel];
    const changes = watcher.findChanges(newModels, oldModels);
    expect(changes).toEqual([
      {
        id: "2",
        type: "removed",
        model: oldModels[1],
        timestamp: expect.stringContaining("Z"),
      },
    ]);
  });

  test("should load the most recent model list from the database", async () => {
    const oldModels: Model[] = [dummyModel];
    const date1 = new Date(2023, 4, 1);
    watcher.storeModelList(oldModels, date1);

    const newModels: Model[] = [dummyModel, otherModel];
    const date2 = new Date(2023, 4, 2);
    watcher.storeModelList(newModels, date2);

    const loadedModels = watcher.loadModelList();
    expect(loadedModels).toEqual([dummyModel, otherModel]);
  });

  test("should handle an empty database", () => {
    const loadedModels = watcher.loadModelList();
    expect(loadedModels).toEqual([]);
  });
});
