import {LessonAction, UnsupportedLessonActionError} from "../../../learning/model";

export type LessonActionKind = LessonAction['kind'];
export type LessonActionOf<K extends LessonActionKind> = Extract<LessonAction, { kind: K }>;

/**
 * Handles one lesson action. `previous` is the handler this one replaced for the same key (or one that throws
 * `UnsupportedLessonActionError` when there was none), for handlers that extend a behavior another feature contributed.
 */
export type LessonActionHandler<A extends LessonAction = LessonAction> = (action: A, previous: (action: A) => void) => void;

/** Action kinds that share one handler per `name`/`target` instead of one per kind, and the field that tells them apart. */
const DISCRIMINATORS = {
    'curve-visibility': 'target',
    'patch-visibility': 'target',
    'parameter': 'name',
    'animation': 'animationId',
} as const satisfies Partial<Record<LessonActionKind, string>>;

type DiscriminatedKind = keyof typeof DISCRIMINATORS;

function isDiscriminated(kind: LessonActionKind): kind is DiscriminatedKind {
    return kind in DISCRIMINATORS;
}

function discriminatorOf(action: LessonAction): string | undefined {
    if (!isDiscriminated(action.kind)) return undefined;
    return String((action as unknown as Record<string, unknown>)[DISCRIMINATORS[action.kind]]);
}

/** Narrows a handler to the actions the graph can really apply (for example the names a graph owns). */
export interface LessonActionHandlerOptions<A extends LessonAction> {
    supports?: (action: A) => boolean;
}

interface RegisteredHandler {
    handler: LessonActionHandler<any>;
    supports?: (action: any) => boolean;
}

/** A feature contributes the handlers it owns to a graph's registry. */
export type LessonActionFeature = (registry: LessonActionRegistry) => void;

/**
 * The lesson actions a graph supports. Graphs compose it from the features they use; an action nobody registered
 * is rejected with `UnsupportedLessonActionError`. Handlers are looked up by kind, or by kind and discriminator
 * (`curve-visibility` by target, `parameter` and `animation` by name), the more specific one first.
 */
export class LessonActionRegistry {
    private readonly handlers = new Map<string, RegisteredHandler>();

    /** Registers the handler of every action of `kind`. A later registration for the same key replaces this one. */
    on<K extends LessonActionKind>(kind: K, handler: LessonActionHandler<LessonActionOf<K>>,
                                   options: LessonActionHandlerOptions<LessonActionOf<K>> = {}): this {
        return this.register(kind, handler, options.supports);
    }

    /** Registers the handler of the actions of `kind` whose discriminator (target or name) is `value`. */
    onDiscriminated<K extends DiscriminatedKind>(kind: K, value: string, handler: LessonActionHandler<LessonActionOf<K>>,
                                                 options: LessonActionHandlerOptions<LessonActionOf<K>> = {}): this {
        return this.register(`${kind}:${value}`, handler, options.supports);
    }

    /** Adds everything a feature contributes. */
    use(feature: LessonActionFeature): this {
        feature(this);
        return this;
    }

    handles(action: LessonAction): boolean {
        return this.find(action) !== undefined;
    }

    apply(action: LessonAction): void {
        const handler = this.find(action);
        if (!handler) throw new UnsupportedLessonActionError(action);
        handler(action, rejected => { throw new UnsupportedLessonActionError(rejected); });
    }

    /** A replacing handler inherits the replaced handler's `supports` unless it gives its own. */
    private register(key: string, handler: LessonActionHandler<any>, supports?: (action: any) => boolean): this {
        const replaced = this.handlers.get(key);
        this.handlers.set(key, {
            handler: replaced
                ? (action, unsupported) => handler(action, earlier => replaced.handler(earlier, unsupported))
                : handler,
            supports: supports ?? replaced?.supports,
        });
        return this;
    }

    private find(action: LessonAction): LessonActionHandler<any> | undefined {
        const discriminator = discriminatorOf(action);
        const candidates = [
            discriminator === undefined ? undefined : this.handlers.get(`${action.kind}:${discriminator}`),
            this.handlers.get(action.kind),
        ];
        return candidates.find(entry => entry !== undefined && (entry.supports?.(action) ?? true))?.handler;
    }
}
