import { describe, test, expect, vi } from "vitest";
import { setTaskFileAccess } from "../../tasks/handlers/task-handler-builder.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { FileToolExecutor } from "../../llm/tools/file-tools.js";

describe("setTaskFileAccess", () => {
  test("sets file access permissions for design-assistant task", () => {
    // Arrange
    const mockTask = {
      id: "test-task-id",
      type: TASK_TYPES.DESIGN_ASSISTANT,
      params: { designId: "v1" },
    };
    
    const mockTaskLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      progress: vi.fn(),
    };

    // Create a real FileToolExecutor to verify methods are called
    const fileToolExecutor = new FileToolExecutor("/tmp");
    const setAllowedReadPathsSpy = vi.spyOn(fileToolExecutor, "setAllowedReadPaths");
    const setAllowedWritePathsSpy = vi.spyOn(fileToolExecutor, "setAllowedWritePaths");

    // Act
    setTaskFileAccess(fileToolExecutor, mockTask, mockTaskLogger);

    // Assert - verify that file access methods were called
    expect(setAllowedReadPathsSpy).toHaveBeenCalled();
    expect(setAllowedWritePathsSpy).toHaveBeenCalled();
    
    // Verify the paths include the design folder
    const readPathsArg = setAllowedReadPathsSpy.mock.calls[0][0];
    expect(readPathsArg.length).toBeGreaterThan(0);
    expect(readPathsArg[0]).toMatch(/\.code-analysis[\\/]design/);
  });

  test("sets restricted paths for design-plan-and-style-system-generate task", () => {
    // Arrange
    const mockTask = {
      id: "test-task-id",
      type: TASK_TYPES.DESIGN_PLAN_AND_STYLE_SYSTEM_GENERATE,
      params: { designId: "v2" },
    };
    
    const mockTaskLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      progress: vi.fn(),
    };

    const fileToolExecutor = new FileToolExecutor("/tmp");
    const setAllowedReadPathsSpy = vi.spyOn(fileToolExecutor, "setAllowedReadPaths");

    // Act
    setTaskFileAccess(fileToolExecutor, mockTask, mockTaskLogger);

    // Assert - verify that restricted read paths were set
    expect(setAllowedReadPathsSpy).toHaveBeenCalled();
    const readPathsArg = setAllowedReadPathsSpy.mock.calls[0][0];
    // Should include the specific design folder
    expect(readPathsArg.length).toBeGreaterThan(0);
    expect(readPathsArg[0]).toMatch(/\.code-analysis[\\/]design\/v2/);
  });

  test("grants unrestricted read access for custom-codebase-task", () => {
    // Arrange
    const mockTask = {
      id: "test-task-id",
      type: TASK_TYPES.CUSTOM_CODEBASE_TASK,
      params: {},
    };
    
    const mockTaskLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      progress: vi.fn(),
    };

    const fileToolExecutor = new FileToolExecutor("/tmp");
    const setAllowAnyReadSpy = vi.spyOn(fileToolExecutor, "setAllowAnyRead");
    const setAllowAnyWriteSpy = vi.spyOn(fileToolExecutor, "setAllowAnyWrite");

    // Act
    setTaskFileAccess(fileToolExecutor, mockTask, mockTaskLogger);

    // Assert - verify that unrestricted access was granted
    expect(setAllowAnyReadSpy).toHaveBeenCalledWith(true);
    expect(setAllowAnyWriteSpy).toHaveBeenCalledWith(true);
  });
});
