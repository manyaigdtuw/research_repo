import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0  # Smaller model for small data
from tensorflow.keras.layers import (GlobalAveragePooling2D, Dense, Dropout, 
                                     BatchNormalization, Input)
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.regularizers import l2
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
import seaborn as sns

# -------------------------------
# Configuration - Optimized for Small Dataset
# -------------------------------
data_dir = '/content/drive/My Drive/MedicinalLeavesProject/Merged dataset'
img_size = 224  # EfficientNetB0 default size
batch_size = 32  # Larger batches for stability with small data
base_learning_rate = 1e-4
epochs = 100  # More epochs with early stopping
seed = 42

# -------------------------------
# AGGRESSIVE Augmentation for Small Dataset
# -------------------------------
def preprocess(img):
    """EfficientNet preprocessing"""
    return tf.keras.applications.efficientnet.preprocess_input(img)

def heavy_augmentation(img):
    """Maximum augmentation to expand small dataset"""
    # Geometric transforms
    img = tf.image.random_flip_left_right(img)
    img = tf.image.random_flip_up_down(img)
    
    # Random rotation (0, 90, 180, 270 degrees)
    k = tf.random.uniform(shape=[], minval=0, maxval=4, dtype=tf.int32)
    img = tf.image.rot90(img, k)
    
    # Color jitter - simulate different lighting/seasons
    img = tf.image.random_brightness(img, max_delta=0.3)
    img = tf.image.random_contrast(img, lower=0.7, upper=1.3)
    img = tf.image.random_saturation(img, lower=0.7, upper=1.3)
    img = tf.image.random_hue(img, max_delta=0.1)
    
    # Random zoom
    if tf.random.uniform(()) < 0.7:
        scale = tf.random.uniform([], 0.8, 1.2)
        new_h = tf.cast(img_size * scale, tf.int32)
        new_w = tf.cast(img_size * scale, tf.int32)
        img = tf.image.resize(img, [new_h, new_w])
        img = tf.image.resize_with_crop_or_pad(img, img_size, img_size)
    
    # Random translation (simulate off-center photos)
    if tf.random.uniform(()) < 0.5:
        shift_h = tf.random.uniform([], -30, 30, dtype=tf.int32)
        shift_w = tf.random.uniform([], -30, 30, dtype=tf.int32)
        img = tf.roll(img, shift=[shift_h, shift_w], axis=[0, 1])
    
    # Cutout augmentation (20% chance)
    if tf.random.uniform(()) < 0.2:
        mask_size = 40
        y = tf.random.uniform([], 0, img_size - mask_size, dtype=tf.int32)
        x = tf.random.uniform([], 0, img_size - mask_size, dtype=tf.int32)
        mask_value = tf.reduce_mean(img)
        
        # Create cutout
        updates = tf.ones([mask_size, mask_size, 3]) * mask_value
        indices = tf.stack([
            tf.repeat(tf.range(y, y + mask_size), mask_size),
            tf.tile(tf.range(x, x + mask_size), [mask_size]),
        ], axis=1)
        
        # Simple masking approach
        for i in range(mask_size):
            for j in range(mask_size):
                if y+i < img_size and x+j < img_size:
                    img = tf.tensor_scatter_nd_update(
                        img, [[y+i, x+j, 0], [y+i, x+j, 1], [y+i, x+j, 2]], 
                        [mask_value, mask_value, mask_value]
                    )
    
    # Gaussian blur (simulate focus issues) - 15% chance
    if tf.random.uniform(()) < 0.15:
        # Simple blur approximation
        img = tf.nn.avg_pool2d(img[tf.newaxis, ...], ksize=3, strides=1, padding='SAME')[0]
    
    # Gaussian noise
    if tf.random.uniform(()) < 0.2:
        noise = tf.random.normal(shape=tf.shape(img), mean=0.0, stddev=8.0)
        img = img + noise
    
    img = tf.clip_by_value(img, 0, 255)
    return img

def process_image(path, label, augment=False):
    img_bytes = tf.io.read_file(path)
    img = tf.io.decode_image(img_bytes, channels=3, expand_animations=False)
    img = tf.image.resize(img, [img_size, img_size])
    img = tf.cast(img, tf.float32)

    if augment:
        img = heavy_augmentation(img)

    img = preprocess(img)
    return img, label

# -------------------------------
# Dataset Builder with MORE Validation
# -------------------------------
def make_datasets(data_dir, batch_size=32, val_split=0.2, test_split=0.1, seed=42):
    """More validation data to better detect overfitting on small datasets"""
    AUTOTUNE = tf.data.AUTOTUNE

    class_names = np.array(sorted([item.name for item in os.scandir(data_dir) if item.is_dir()]))

    all_files, all_labels = [], []
    class_counts = {}
    
    for label, class_name in enumerate(class_names):
        class_dir = os.path.join(data_dir, class_name)
        files = [os.path.join(class_dir, f) for f in os.listdir(class_dir)
                 if f.lower().endswith(('jpg','jpeg','png','bmp','gif'))]
        all_files.extend(files)
        all_labels.extend([label] * len(files))
        class_counts[class_name] = len(files)

    all_files, all_labels = np.array(all_files), np.array(all_labels)
    
    print(f"\n📊 Dataset Statistics:")
    print(f"Total images: {len(all_files)}")
    print(f"Number of classes: {len(class_names)}")
    print(f"Average per class: {len(all_files)/len(class_names):.1f}")
    print(f"Min per class: {min(class_counts.values())}")
    print(f"Max per class: {max(class_counts.values())}")
    
    # Check for severely imbalanced classes
    min_class = min(class_counts, key=class_counts.get)
    max_class = max(class_counts, key=class_counts.get)
    if class_counts[max_class] / class_counts[min_class] > 3:
        print(f"⚠️  Warning: Class imbalance detected!")
        print(f"   Least: {min_class} ({class_counts[min_class]})")
        print(f"   Most: {max_class} ({class_counts[max_class]})")

    # Stratified split
    train_val_files, test_files, train_val_labels, test_labels = train_test_split(
        all_files, all_labels, test_size=test_split, stratify=all_labels, random_state=seed
    )
    
    train_files, val_files, train_labels, val_labels = train_test_split(
        train_val_files, train_val_labels, 
        test_size=val_split/(1-test_split), 
        stratify=train_val_labels, 
        random_state=seed
    )

    # Class weights for imbalanced data
    unique, counts = np.unique(train_labels, return_counts=True)
    total = len(train_labels)
    class_weights = {i: total / (len(unique) * count) for i, count in zip(unique, counts)}
    
    print(f"\n📦 Split: Train={len(train_files)} | Val={len(val_files)} | Test={len(test_files)}")

    def make_tf_dataset(paths, labels, augment=False, shuffle=False, repeat_augment=1):
        ds = tf.data.Dataset.from_tensor_slices((paths, labels))
        
        # For training with small data, repeat dataset with different augmentations
        if augment and repeat_augment > 1:
            ds = ds.repeat(repeat_augment)
        
        if shuffle:
            ds = ds.shuffle(buffer_size=len(paths)*repeat_augment, seed=seed, reshuffle_each_iteration=True)
        
        ds = ds.map(lambda x,y: process_image(x,y,augment=augment),
                    num_parallel_calls=AUTOTUNE)
        return ds.batch(batch_size).prefetch(AUTOTUNE)

    # Apply multiple augmented versions of training data
    train_ds = make_tf_dataset(train_files, train_labels, augment=True, shuffle=True, repeat_augment=2)
    val_ds   = make_tf_dataset(val_files, val_labels, augment=False)
    test_ds  = make_tf_dataset(test_files, test_labels, augment=False)

    return train_ds, val_ds, test_ds, class_names, class_weights

# -------------------------------
# Prepare Datasets
# -------------------------------
train_ds, val_ds, test_ds, class_names, class_weights = make_datasets(
    data_dir,
    batch_size=batch_size,
    val_split=0.2,
    test_split=0.1,
    seed=seed
)

num_classes = len(class_names)

# -------------------------------
# Smaller Model for Small Dataset
# -------------------------------
def build_model(num_classes, img_size=224):
    """
    EfficientNetB0 - Perfect balance for small datasets
    - Fewer parameters than B3 (reduces overfitting risk)
    - Still powerful enough for fine-grained classification
    """
    input_tensor = Input(shape=(img_size, img_size, 3))
    
    # Load pretrained base
    base_model = EfficientNetB0(include_top=False, weights='imagenet', input_tensor=input_tensor)
    
    # Fine-tuning strategy: freeze early layers, unfreeze later ones
    # Early layers learn generic features (edges, colors)
    # Later layers learn specific features (leaf patterns)
    for layer in base_model.layers[:-20]:  # Freeze first 80% layers
        layer.trainable = False
    
    for layer in base_model.layers[-20:]:  # Unfreeze last 20%
        layer.trainable = True
    
    print(f"Base model: {len(base_model.layers)} layers")
    print(f"Trainable: {len([l for l in base_model.layers if l.trainable])} layers")
    
    # Classification head - simpler to prevent overfitting
    x = GlobalAveragePooling2D(name='global_pool')(base_model.output)
    x = Dropout(0.3)(x)
    x = Dense(256, activation='relu', kernel_regularizer=l2(0.01), name='dense_1')(x)
    x = BatchNormalization()(x)
    x = Dropout(0.4)(x)
    x = Dense(128, activation='relu', kernel_regularizer=l2(0.01), name='dense_2')(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    
    # Output layer with label smoothing
    outputs = Dense(num_classes, activation='softmax', name='predictions')(x)
    
    model = Model(inputs=input_tensor, outputs=outputs, name='plant_classifier')
    return model

model = build_model(num_classes, img_size)

# Compile with label smoothing (reduces overconfidence)
model.compile(
    optimizer=Adam(learning_rate=base_learning_rate),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(label_smoothing=0.1),
    metrics=[
        'accuracy',
        tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy'),
        tf.keras.metrics.TopKCategoricalAccuracy(k=5, name='top_5_accuracy')
    ]
)

print("\n" + "="*60)
print("MODEL SUMMARY")
print("="*60)
model.summary()

# -------------------------------
# Callbacks Optimized for Small Data
# -------------------------------
early_stopping = EarlyStopping(
    monitor='val_accuracy',
    patience=20,  # More patience for small datasets
    restore_best_weights=True,
    verbose=1,
    mode='max'
)

model_checkpoint = ModelCheckpoint(
    'best_plant_model.keras',
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1,
    mode='max'
)

# Aggressive learning rate reduction
reduce_lr = ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,  # Cut LR in half
    patience=7,
    min_lr=1e-7,
    verbose=1,
    mode='min'
)

# Track overfitting
class OverfitMonitor(tf.keras.callbacks.Callback):
    def on_epoch_end(self, epoch, logs=None):
        train_acc = logs.get('accuracy')
        val_acc = logs.get('val_accuracy')
        gap = train_acc - val_acc
        
        if gap > 0.15:  # More than 15% gap
            print(f"\n⚠️  Overfitting detected! Train-Val gap: {gap:.1%}")

callbacks = [early_stopping, model_checkpoint, reduce_lr, OverfitMonitor()]

# -------------------------------
# Training
# -------------------------------
print("\n" + "="*60)
print("STARTING TRAINING")
print("="*60)

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=epochs,
    callbacks=callbacks,
    class_weight=class_weights,
    verbose=1
)

# -------------------------------
# Evaluation
# -------------------------------
print("\n" + "="*60)
print("EVALUATING ON TEST SET")
print("="*60)

test_results = model.evaluate(test_ds, verbose=1)
test_loss = test_results[0]
test_acc = test_results[1]
test_top3 = test_results[2]
test_top5 = test_results[3]

print(f'\n📊 Test Results:')
print(f'   Accuracy: {test_acc:.1%}')
print(f'   Top-3 Accuracy: {test_top3:.1%}')
print(f'   Top-5 Accuracy: {test_top5:.1%}')

# -------------------------------
# Detailed Analysis
# -------------------------------
y_true = np.concatenate([y for x,y in test_ds], axis=0)
y_pred_probs = model.predict(test_ds, verbose=0)
y_pred = np.argmax(y_pred_probs, axis=1)

print("\n" + "="*60)
print("CLASSIFICATION REPORT")
print("="*60)
print(classification_report(y_true, y_pred, target_names=class_names, digits=3))

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)

plt.figure(figsize=(max(12, num_classes*0.5), max(10, num_classes*0.4)))
sns.heatmap(cm, annot=True, fmt="d", xticklabels=class_names, 
            yticklabels=class_names, cmap="YlOrRd", 
            cbar_kws={'label': 'Count'}, annot_kws={'size': 8})
plt.title(f"Confusion Matrix - Test Set (Acc: {test_acc:.1%})", fontsize=14, pad=15)
plt.ylabel("True Label", fontsize=11)
plt.xlabel("Predicted Label", fontsize=11)
plt.xticks(rotation=45, ha='right', fontsize=9)
plt.yticks(rotation=0, fontsize=9)
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=300, bbox_inches='tight')
plt.show()

# Find problematic class pairs
print("\n" + "="*60)
print("MOST CONFUSED PLANT PAIRS")
print("="*60)

normalized_cm = cm.astype('float') / (cm.sum(axis=1)[:, np.newaxis] + 1e-10)
np.fill_diagonal(normalized_cm, 0)

confused_pairs = []
for i in range(len(class_names)):
    for j in range(len(class_names)):
        if i != j and cm[i,j] > 2:  # At least 3 confusions
            confused_pairs.append({
                'true': class_names[i],
                'pred': class_names[j],
                'count': cm[i,j],
                'rate': normalized_cm[i,j]
            })

if confused_pairs:
    for pair in sorted(confused_pairs, key=lambda x: x['count'], reverse=True)[:10]:
        print(f"  {pair['true']:20s} → {pair['pred']:20s} : "
              f"{pair['count']:2d} errors ({pair['rate']:5.1%})")
else:
    print("  ✅ No major confusion pairs detected!")

# Training curves
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Accuracy
axes[0].plot(history.history['accuracy'], label='Train', linewidth=2)
axes[0].plot(history.history['val_accuracy'], label='Validation', linewidth=2)
axes[0].axhline(y=test_acc, color='r', linestyle='--', label=f'Test ({test_acc:.1%})', linewidth=2)
axes[0].set_title('Model Accuracy', fontsize=14, fontweight='bold')
axes[0].set_xlabel('Epoch', fontsize=12)
axes[0].set_ylabel('Accuracy', fontsize=12)
axes[0].legend(fontsize=10)
axes[0].grid(True, alpha=0.3)

# Loss
axes[1].plot(history.history['loss'], label='Train', linewidth=2)
axes[1].plot(history.history['val_loss'], label='Validation', linewidth=2)
axes[1].set_title('Model Loss', fontsize=14, fontweight='bold')
axes[1].set_xlabel('Epoch', fontsize=12)
axes[1].set_ylabel('Loss', fontsize=12)
axes[1].legend(fontsize=10)
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('training_curves.png', dpi=300, bbox_inches='tight')
plt.show()

# Per-class accuracy
per_class_acc = cm.diagonal() / (cm.sum(axis=1) + 1e-10)
worst_classes = np.argsort(per_class_acc)[:5]

print("\n" + "="*60)
print("WORST PERFORMING CLASSES (Need more data)")
print("="*60)
for idx in worst_classes:
    total = cm[idx].sum()
    correct = cm[idx, idx]
    print(f"  {class_names[idx]:25s}: {per_class_acc[idx]:5.1%} ({correct}/{total})")

# -------------------------------
# Save Everything
# -------------------------------
model.save('/content/drive/My Drive/MedicinalLeavesProject/final_model.h5')
model.save('/content/drive/My Drive/MedicinalLeavesProject/final_model.keras')

# Save class names
with open('/content/drive/My Drive/MedicinalLeavesProject/class_names.txt', 'w') as f:
    f.write('\n'.join(class_names))

print("\n" + "="*60)
print("✅ TRAINING COMPLETE!")
print("="*60)
print("\n📁 Saved files:")
print("   - final_model.keras")
print("   - final_model.h5") 
print("   - class_names.txt")
print("   - confusion_matrix.png")
print("   - training_curves.png")

print("\n💡 Recommendations:")
if test_acc < 0.7:
    print("   ⚠️  Accuracy is low. Try:")
    print("      1. Collect 50-100 more images per class")
    print("      2. Focus on confused pairs shown above")
    print("      3. Ensure image quality is good")
elif test_acc < 0.85:
    print("   ⚙️  Decent performance. To improve:")
    print("      1. Add more images for worst performing classes")
    print("      2. Check if some classes are too similar")
else:
    print("   ✅ Excellent performance for small dataset!")
    print("   Consider deploying to your app!")