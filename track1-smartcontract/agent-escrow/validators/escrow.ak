/// Agent Escrow - Simple escrow for AI agent payments
/// Built by VHAGAR for USDC Agentic Hackathon

use aiken/collection/list
use cardano/transaction.{Transaction}

/// Escrow datum - who can release/refund
pub type Datum {
  creator: ByteArray,
  worker: ByteArray,
  job_id: ByteArray,
}

/// Actions on the escrow
pub type Redeemer {
  Release
  Refund
}

/// Escrow validator
validator escrow {
  spend(
    datum_opt: Option<Datum>,
    redeemer: Redeemer,
    _self: Data,
    tx: Transaction,
  ) {
    expect Some(datum) = datum_opt
    
    when redeemer is {
      Release -> {
        // Creator must sign to release to worker
        list.has(tx.extra_signatories, datum.creator)
      }
      Refund -> {
        // Both must sign for refund, OR only creator after deadline
        let creator_signed = list.has(tx.extra_signatories, datum.creator)
        let worker_signed = list.has(tx.extra_signatories, datum.worker)
        creator_signed && worker_signed
      }
    }
  }
}
