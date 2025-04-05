import { createDocumentation } from '@hitomihiumi/micro-docgen';
import { name, version } from './package.json';

async function main() {
    const data = await createDocumentation({
        name,
        version,
        input: ['src'],
        output: 'docs',
        tsconfigPath: './tsconfig.json',
        jsonName: '0.1.0.json',
    });

    console.log(`Took ${data.metadata.generationMs}ms to generate the documentation!`);
}

main();