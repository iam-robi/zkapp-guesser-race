import {
    DeployArgs,
    Field,
    SmartContract,
    State,
    state,
    Permissions,
    CircuitValue,
    Encoding,
    method,
    PublicKey, Poseidon, PrivateKey, Circuit
} from "snarkyjs";

export class Answer extends CircuitValue {
    value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }

    toHash(): Field {
        return Poseidon.hash(Encoding.stringToFields(this.value));
    }

}


export class SecretGuesserRace extends SmartContract {

    @state(Field) secret = State<Field>();
    //TODO: find best method to parameter #of solvers in the race ( first N ) not only 2 solvers
    @state(PublicKey) solver1 = State<PublicKey>();
    @state(PublicKey) solver2 = State<PublicKey>();
    //TODO: use merkletree to authorize whitelist of race participants

    events = {
        "new-correct-guess": PublicKey
    }


    deploy(args: DeployArgs) {
        super.deploy(args);
        this.setPermissions({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
        });
        this.secret.set(Field(0))
        this.solver1.set(PublicKey.empty())
        this.solver2.set(PublicKey.empty())

    }
    @method init(initialSecret: Field) {
        this.secret.set(initialSecret);
    }

    @method updateSecret(newSecret: Answer, admin: PrivateKey) {
        let replacement = newSecret.toHash();
        const currentSecret = this.secret.get();
        this.secret.assertEquals(currentSecret);
        this.secret.set(replacement);
        const adminPk = admin.toPublicKey();
        this.account.delegate.assertEquals(adminPk);
    }

    @method guess(answer: Answer, guesser: PrivateKey) {
        let hashGuess: Field = answer.toHash();
        const currentSecret = this.secret.get();
        this.secret.assertEquals(currentSecret);
        hashGuess.assertEquals(currentSecret);
        const guesserAccount = guesser.toPublicKey()
        const solver1 = this.solver1.get();
        this.solver1.assertEquals(solver1);
        const solver2 = this.solver2.get();
        this.solver2.assertEquals(solver2);

        let newSolver1 = Circuit.if(
            solver1.isEmpty(),
            guesserAccount,
            solver1
        )
        this.solver1.set(newSolver1);
        let newSolver2 = Circuit.if(
            !solver1.isEmpty() && solver2.isEmpty(),
            guesserAccount,
            solver2
        )
        this.solver2.set(newSolver2);
        //todo register timestamps in state ( how to do mapping to public key ?)

        this.emitEvent("new-correct-guess", guesserAccount)

    }

}