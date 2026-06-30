import type {
  PluginConfigSchema,
  PluginConfigFieldSchema,
  PluginConfigFieldType,
} from '@agent-os/plugins';

interface PluginConfigFieldBuilder {
  readonly type: PluginConfigFieldType;
  required(required?: boolean): PluginConfigFieldBuilder;
  default(value: unknown): PluginConfigFieldBuilder;
  description(desc: string): PluginConfigFieldBuilder;
  enum(values: readonly unknown[]): PluginConfigFieldBuilder;
  properties(props: Record<string, PluginConfigFieldSchema>): PluginConfigFieldBuilder;
  items(itemSchema: PluginConfigFieldSchema): PluginConfigFieldBuilder;
  build(): PluginConfigSchemaBuilder;
}

interface PluginConfigSchemaBuilder {
  readonly fields: Record<string, PluginConfigFieldSchema>;
  field(name: string, type: PluginConfigFieldType): PluginConfigFieldBuilder;
  build(): PluginConfigSchema;
}

const createFieldBuilder = (
  parent: PluginConfigSchemaBuilder,
  name: string,
  type: PluginConfigFieldType,
): PluginConfigFieldBuilder => {
  const options: {
    type: PluginConfigFieldType;
    required?: boolean;
    default?: unknown;
    description?: string;
    enum?: readonly unknown[];
    items?: PluginConfigFieldSchema;
    properties?: Record<string, PluginConfigFieldSchema>;
  } = { type };

  const builder: PluginConfigFieldBuilder = {
    type,

    required(required = true): PluginConfigFieldBuilder {
      options.required = required;
      return builder;
    },

    default(value: unknown): PluginConfigFieldBuilder {
      options.default = value;
      return builder;
    },

    description(desc: string): PluginConfigFieldBuilder {
      options.description = desc;
      return builder;
    },

    enum(values: readonly unknown[]): PluginConfigFieldBuilder {
      options.enum = values;
      return builder;
    },

    properties(props: Record<string, PluginConfigFieldSchema>): PluginConfigFieldBuilder {
      options.properties = props;
      return builder;
    },

    items(itemSchema: PluginConfigFieldSchema): PluginConfigFieldBuilder {
      options.items = itemSchema;
      return builder;
    },

    build(): PluginConfigSchemaBuilder {
      const field: PluginConfigFieldSchema = { type: options.type };
      if (options.required !== undefined) {
        (field as { required?: boolean }).required = options.required;
      }
      if (options.default !== undefined) {
        (field as { default?: unknown }).default = options.default;
      }
      if (options.description !== undefined) {
        (field as { description?: string }).description = options.description;
      }
      if (options.enum !== undefined) {
        (field as { enum?: readonly unknown[] }).enum = options.enum;
      }
      if (options.items !== undefined) {
        (field as { items?: PluginConfigFieldSchema }).items = options.items;
      }
      if (options.properties !== undefined) {
        (field as { properties?: Record<string, PluginConfigFieldSchema> }).properties =
          options.properties;
      }
      parent.fields[name] = field;
      return parent;
    },
  };

  return builder;
};

export const definePluginConfig = (): PluginConfigSchemaBuilder => {
  const fields: Record<string, PluginConfigFieldSchema> = {};

  const builder: PluginConfigSchemaBuilder = {
    fields,

    field(name: string, type: PluginConfigFieldType): PluginConfigFieldBuilder {
      return createFieldBuilder(builder, name, type);
    },

    build(): PluginConfigSchema {
      return { ...fields };
    },
  };

  return builder;
};
