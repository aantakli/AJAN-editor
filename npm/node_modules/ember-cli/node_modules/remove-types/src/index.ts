import { transformAsync, createConfigItem } from '@babel/core';
import type { VisitNodeObject, Node } from '@babel/traverse';
import { format, Options as PrettierOptions } from 'prettier';

// @ts-expect-error We're only importing so we can create a config item, so we don't care about types
import bts from '@babel/plugin-transform-typescript';
const babelTsTransform = createConfigItem(bts);

// @ts-expect-error We're only importing so we can create a config item, so we don't care about types
import bsd from '@babel/plugin-syntax-decorators';
const babelDecoratorSyntax = createConfigItem([bsd, { legacy: true }]);

export async function removeTypes(code: string, prettierConfig: PrettierOptions | boolean = true) {
  // Babel collapses newlines all over the place, which messes with the formatting of almost any
  // code you pass to it. To preserve the formatting, we go through and mark all the empty lines
  // in the code string *before* transforming it. This allows us to go back through after the
  // transformation re-insert the empty lines in the correct place relative to the new code that
  // has been generated.
  code = code.replace(/\n\n+/g, '/* ___NEWLINE___ */\n');

  // When removing TS-specific constructs (e.g. interfaces), we want to make sure we also remove
  // any comments that are associated with those constructs, since otherwise we'll be left with
  // comments that refer to something that isn't actually there.
  // Credit to https://github.com/cyco130/detype for figuring out this very useful pattern
  const removeComments: VisitNodeObject<unknown, Node> = {
    enter(nodePath) {
      if (!nodePath.node.leadingComments) return;

      for (let i = nodePath.node.leadingComments.length - 1; i >= 0; i--) {
        const comment = nodePath.node.leadingComments[i];

        if (
          code.slice(comment.end).match(/^\s*\n\s*\n/) ||
          comment.value.includes('___NEWLINE___')
        ) {
          // There is at least one empty line between the comment and the TypeScript specific construct
          // We should keep this comment and those before it
          break;
        }
        comment.value = '___REMOVE_ME___';
      }
    },
  };

  const transformed = await transformAsync(code, {
    plugins: [
      {
        name: 'comment-remover',
        visitor: {
          TSTypeAliasDeclaration: removeComments,
          TSInterfaceDeclaration: removeComments,
          TSDeclareFunction: removeComments,
          TSDeclareMethod: removeComments,
          TSImportType: removeComments,
          TSModuleDeclaration: removeComments,
        },
      },
      babelTsTransform,
      babelDecoratorSyntax,
    ],
    generatorOpts: {
      retainLines: true,
      shouldPrintComment: (comment) => comment !== '___REMOVE_ME___',
    },
  });

  if (!transformed || !transformed.code) {
    throw new Error('There was an issue with the Babel transform.');
  }

  const fixed = transformed.code.replace(/\/\* ___NEWLINE___ \*\//g, '\n');

  // If the user has *explicitly* passed `false` here, it means they do not want us to run Prettier
  // at all, so we bail here.
  if (prettierConfig === false) {
    return fixed;
  }

  const standardPrettierOptions = {
    parser: 'babel',
    singleQuote: true,
  };

  // If `prettierConfig` is *explicitly* true (as opposed to truthy), it means the user has opted in
  // to default behavior either explicitly or implicitly. Either way, we run basic Prettier on it.
  if (prettierConfig === true) {
    return format(fixed, standardPrettierOptions);
  }

  // If we've made it here, the user has passed their own Prettier options so we merge it with ours
  // and let theirs overwrite any of the default settings.
  const mergedPrettierOptions = {
    ...standardPrettierOptions,
    ...prettierConfig,
  };

  return format(fixed, mergedPrettierOptions);
}

export default removeTypes;
